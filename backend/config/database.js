const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/internationaltijarat';
    
    // Ensure we have a valid MongoDB URI
    if (!mongoURI || mongoURI === 'your_mongodb_connection_string_here') {
      throw new Error('MongoDB URI is not properly configured. Please set MONGODB_URI environment variable.');
    }
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      bufferCommands: false, // Disable mongoose buffering in serverless
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      w: 'majority',
      readPreference: 'primary', // Always read from primary node
      readConcern: { level: 'local' } // Don't use cache for reads
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);
    
    // Add database indexes for performance (only once on startup)
    // Only if database connection is available and stable
    if (process.env.NODE_ENV === 'production' && mongoose.connection.readyState === 1) {
      try {
        const addDatabaseIndexes = require('../utils/addDatabaseIndexes');
        await addDatabaseIndexes();
      } catch (indexError) {
        logger.warn('⚠️ Database connection not available, skipping index creation');
      }
    }
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      logger.info('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('🔌 Mongoose disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
