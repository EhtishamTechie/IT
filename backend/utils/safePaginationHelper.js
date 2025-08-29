/**
 * SAFE PAGINATION HELPER - Non-Breaking Implementation
 * This creates NEW pagination endpoints alongside existing ones
 * Only switch when fully tested and verified
 */

const createSafePaginatedQuery = async (model, baseQuery = {}, options = {}) => {
  try {
    // Extract pagination parameters
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(options.limit) || 20), 100); // Max 100 for safety
    const skip = (page - 1) * limit;
    
    // Extract sort parameters
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = sortOrder;
    
    // Build query with filters
    const query = { ...baseQuery };
    
    // Add search if provided
    if (options.search && options.searchFields) {
      query.$or = options.searchFields.map(field => ({
        [field]: { $regex: options.search, $options: 'i' }
      }));
    }
    
    // Add dynamic filters
    if (options.filters) {
      Object.keys(options.filters).forEach(key => {
        const value = options.filters[key];
        if (value !== null && value !== undefined && value !== '') {
          query[key] = value;
        }
      });
    }
    
    // Execute query with proper population
    let queryBuilder = model.find(query).sort(sort).skip(skip).limit(limit);
    
    // Add population if specified
    if (options.populate) {
      options.populate.forEach(pop => {
        if (typeof pop === 'string') {
          queryBuilder = queryBuilder.populate(pop);
        } else {
          queryBuilder = queryBuilder.populate(pop.path, pop.select);
        }
      });
    }
    
    // Add lean for better performance if specified
    if (options.lean !== false) {
      queryBuilder = queryBuilder.lean();
    }
    
    // Execute queries in parallel
    const [data, totalCount] = await Promise.all([
      queryBuilder.exec(),
      model.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      query: {
        filters: options.filters || {},
        sort: { [sortBy]: sortOrder === 1 ? 'asc' : 'desc' },
        search: options.search || ''
      }
    };
    
  } catch (error) {
    console.error('Pagination error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limit || 20,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
};

/**
 * SAFE INFINITE SCROLL HELPER
 * For frontend infinite scroll implementation
 */
const createInfiniteScrollQuery = async (model, baseQuery = {}, options = {}) => {
  const limit = Math.min(parseInt(options.limit) || 20, 50); // Lower limit for infinite scroll
  const lastId = options.lastId;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  
  const query = { ...baseQuery };
  
  // Cursor-based pagination using _id or custom field
  if (lastId) {
    const cursorField = options.cursorField || '_id';
    query[cursorField] = sortOrder === 1 
      ? { $gt: lastId } 
      : { $lt: lastId };
  }
  
  // Add search and filters (same as paginated query)
  if (options.search && options.searchFields) {
    query.$or = options.searchFields.map(field => ({
      [field]: { $regex: options.search, $options: 'i' }
    }));
  }
  
  if (options.filters) {
    Object.keys(options.filters).forEach(key => {
      const value = options.filters[key];
      if (value !== null && value !== undefined && value !== '') {
        query[key] = value;
      }
    });
  }
  
  const sort = {};
  sort[sortBy] = sortOrder;
  
  try {
    let queryBuilder = model.find(query).sort(sort).limit(limit + 1); // +1 to check if more exist
    
    // Add population
    if (options.populate) {
      options.populate.forEach(pop => {
        if (typeof pop === 'string') {
          queryBuilder = queryBuilder.populate(pop);
        } else {
          queryBuilder = queryBuilder.populate(pop.path, pop.select);
        }
      });
    }
    
    if (options.lean !== false) {
      queryBuilder = queryBuilder.lean();
    }
    
    const results = await queryBuilder.exec();
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    
    const nextCursor = data.length > 0 
      ? data[data.length - 1][options.cursorField || '_id'] 
      : null;
    
    return {
      success: true,
      data,
      hasMore,
      nextCursor,
      count: data.length
    };
    
  } catch (error) {
    console.error('Infinite scroll error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      hasMore: false,
      nextCursor: null,
      count: 0
    };
  }
};

module.exports = {
  createSafePaginatedQuery,
  createInfiniteScrollQuery
};
