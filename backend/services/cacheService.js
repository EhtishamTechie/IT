const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // In-memory cache with 30-minute default TTL
    this.memoryCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false // Better performance
    });

    // Redis cache (if available)
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    // Only try to connect to Redis if explicitly configured
    if (!process.env.REDIS_URL) {
      logger.info('📦 Cache: Using memory-only cache (Redis not configured)');
      return;
    }

    try {
      const redis = require('redis');
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          commandTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.warn('Redis connection failed after 3 retries, switching to memory cache only');
              return false; // Stop retrying
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      await this.redisClient.connect();
      logger.info('✅ Redis cache connected');

      this.redisClient.on('error', (err) => {
        logger.warn('Redis error, falling back to memory cache:', err.message);
        this.redisClient = null;
      });

      this.redisClient.on('disconnect', () => {
        logger.warn('Redis disconnected, using memory cache');
        this.redisClient = null;
      });

    } catch (error) {
      logger.warn('Redis connection failed, using memory cache only:', error.message);
      this.redisClient = null;
    }
  }

  // Get from cache
  async get(key) {
    try {
      // Try Redis first (if available)
      if (this.redisClient) {
        const value = await this.redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      return this.memoryCache.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache
  async set(key, value, ttl = 1800) {
    try {
      // Set in Redis (if available)
      if (this.redisClient) {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      }

      // Always set in memory cache as backup
      this.memoryCache.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  // Delete from cache
  async del(key) {
    try {
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      this.memoryCache.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  // Clear pattern from cache
  async clearPattern(pattern) {
    try {
      if (this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      // Clear memory cache by pattern
      const keys = this.memoryCache.keys();
      const patternBase = pattern.replace('*', '');
      keys.forEach(key => {
        if (key.startsWith(patternBase) || key.includes('/products') || key.includes('/categories')) {
          logger.debug(`Clearing cache key: ${key}`);
          this.memoryCache.del(key);
        }
      });
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
    }
  }

  // Get cache stats
  getStats() {
    const memoryStats = this.memoryCache.getStats();
    return {
      memory: memoryStats,
      redis: this.redisClient ? 'connected' : 'not available'
    };
  }

  // Cache middleware for Express routes
  middleware(duration = 1800) {
    return async (req, res, next) => {
      // Skip cache for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip cache for authenticated admin requests
      if (req.headers.authorization && req.path.includes('/admin/')) {
        return next();
      }

      // Create a consistent cache key with prefix
      const cacheKey = `cache:${req.originalUrl || req.url}`;

      const key = `cache:${req.originalUrl}`;
      
      try {
        const cached = await this.get(key);
        if (cached) {
          logger.debug(`Cache HIT: ${key}`);
          return res.json(cached);
        }

        // Store original res.json
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = (body) => {
          // Only cache successful responses
          if (res.statusCode === 200 && body.success !== false) {
            this.set(key, body, duration);
            logger.debug(`Cache SET: ${key}`);
          }
          return originalJson.call(res, body);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
