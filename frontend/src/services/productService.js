// Product Service - Complete API Integration for International Tijarat
import API from '../api.js';
import { config } from '../config';

class ProductService {
  // Get all products with optional filters
  static async getAllProducts(filters = {}) {
    try {
      const response = await API.get('/products', { params: filters });
      // Backend returns {success: true, products: [...], totalProducts: X, currentPage: Y, totalPages: Z, hasNextPage: boolean}
      return {
        success: true,
        data: response.data.products || response.data || [],
        totalProducts: response.data.totalProducts,
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        hasNextPage: response.data.hasNextPage,
        hasPrevPage: response.data.hasPrevPage
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load products'
      };
    }
  }

  // Get product by ID
  static async getProductById(id) {
    try {
      const response = await API.get(`/products/${id}`);
      
      // Return the response data directly - let the component handle the structure
      return response.data;
    } catch (error) {
      console.error('🔍 ProductService: Error fetching product:', error);
      
      // Handle different error formats
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data?.message || `HTTP ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error: Unable to reach server');
      } else {
        // Other error
        throw new Error(error.message || 'Unknown error occurred');
      }
    }
  }

  // Get products by category (main or sub category)
  static async getProductsByCategory(categoryName) {
    try {
      const response = await API.get(`/products/category/${categoryName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  // Search products by title or keywords
  static async searchProducts(query, filters = {}) {
    try {
      const searchParams = {
        q: query, // Backend expects 'q' parameter
        ...filters
      };
      const response = await API.get('/products/search', { params: searchParams });
      return response.data;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Get featured products (stock between 100-200)
  static async getFeaturedProducts(limit = 8) {
    try {
      const response = await API.get(`/products/featured?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return {
        success: false,
        products: [],
        error: error.response?.data?.message || 'Failed to load featured products'
      };
    }
  }

  // Get new arrivals (most recently added products)
  static async getTrendingProducts(limit = 20) {
    try {
      const response = await API.get(`/products/trending?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching new arrivals:', error);
      throw error;
    }
  }

  // Get premium products (stock < 50)
  static async getPremiumProducts(limit = 8) {
    try {
      // Get all products and filter on the frontend
      const response = await this.getAllProducts({ limit: 100 }); // Get more products to filter from
      if (!response.success) {
        throw new Error(response.error);
      }
      
      // Filter products with stock less than 50
      const premiumProducts = response.data
        .filter(product => product.stock < 50)
        .slice(0, limit);

      return {
        success: true,
        products: this.formatProducts(premiumProducts)
      };
    } catch (error) {
      console.error('Error fetching premium products:', error);
      throw error;
    }
  }

  // Get new arrivals
  static async getNewArrivals(limit = 8) {
    try {
      const response = await API.get(`/products/new-arrivals?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching new arrivals:', error);
      throw error;
    }
  }

  // Get products by main category
  static async getProductsByMainCategory(mainCategory) {
    try {
      const response = await API.get(`/products/main-category/${mainCategory}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by main category:', error);
      throw error;
    }
  }

  // Get products by sub category
  static async getProductsBySubCategory(subCategory) {
    try {
      const response = await API.get(`/products/sub-category/${subCategory}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products by sub category:', error);
      throw error;
    }
  }

  // Get all categories
  static async getCategories() {
    try {
      const response = await API.get('/products/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Format product image URL
  static formatImageUrl(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http') && !imagePath.includes('localhost:5000')) return imagePath;
    return `${config.UPLOADS_URL}/${imagePath.replace(/^uploads\//, '')}`;
  }

  // Format product for display
  static formatProduct(product) {
    return {
      ...product,
      image: this.formatImageUrl(product.image),
      formattedPrice: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(product.price),
    };
  }

  // Format multiple products with safety checks
  static formatProducts(products) {
    if (!Array.isArray(products)) {
      console.warn('❌ formatProducts received non-array:', products);
      return [];
    }
    return products.map(product => ({
      ...product,
      // Keep original images array and add formatted image
      images: product.images || [],
      image: (product.images && product.images.length > 0) 
        ? this.formatImageUrl(product.images[0])
        : this.formatImageUrl(product.image),
      // Ensure these fields exist
      price: product.price || 0,
      title: product.title || 'Untitled Product',
      formattedPrice: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(product.price || 0),
    }));
  }

  // Format image URL with safety check
  static formatImageUrl(imagePath) {
    console.log('🖼️ formatImageUrl input:', imagePath);
    
    if (!imagePath) {
      console.log('⚠️ No image path provided');
      return null;
    }
    
    // If it's already an HTTP URL, return as is
    if (imagePath.startsWith('http')) {
      console.log('✅ Already an HTTP URL:', imagePath);
      return imagePath;
    }

    // Handle placeholder image specially
    if (imagePath.includes('placeholder-image')) {
      console.log('🎯 Using placeholder image');
      return '/uploads/products/placeholder-image.jpg';
    }
    
    // Remove any double slashes and clean up the path
    const cleanedPath = imagePath
      .replace(/([^:])\/+/g, '$1/') // Fix double slashes
      .replace(/^\/?(uploads\/)+/, '') // Remove leading uploads/
      .replace(/products\/products\//, 'products/'); // Fix duplicate products folder
      
    console.log('🧹 Cleaned path:', cleanedPath);
      
    // For product images, ensure path starts with products/
    const productsPath = cleanedPath.startsWith('products/') 
      ? cleanedPath 
      : `products/${cleanedPath.replace(/^\/+/, '')}`;  // Remove leading slashes before adding products/
    
    console.log('📁 Products path:', productsPath);

    // Build the final path, ensuring no double slashes
    const finalPath = productsPath.startsWith('uploads/') 
      ? productsPath.replace(/([^:])\/+/g, '$1/') 
      : `uploads/${productsPath}`.replace(/([^:])\/+/g, '$1/');
    
    console.log('🎯 Final path:', finalPath);
    
    // Build full URL, ensuring clean slashes
    const fullUrl = `${config.UPLOADS_URL}/${finalPath}`.replace(/([^:])\/+/g, '$1/');
    console.log('🌐 Full URL:', fullUrl);
    
    return fullUrl;
  }
}

export default ProductService;
