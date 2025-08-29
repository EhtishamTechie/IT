const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Database indexes for performance optimization
const addDatabaseIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Check if database connection exists
    if (!db) {
      logger.warn('⚠️ Database connection not available, skipping index creation');
      return;
    }
    
    // Product indexes
    await db.collection('products').createIndex({ status: 1 });
    await db.collection('products').createIndex({ 'category.main': 1 });
    await db.collection('products').createIndex({ createdAt: -1 });
    await db.collection('products').createIndex({ price: 1 });
    await db.collection('products').createIndex({ title: 'text', description: 'text' });
    
    // Order indexes
    await db.collection('orders').createIndex({ email: 1 });
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ status: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    // Vendor indexes
    await db.collection('vendors').createIndex({ email: 1 }, { unique: true });
    await db.collection('vendors').createIndex({ status: 1 });
    
    // Used Products indexes
    await db.collection('usedproducts').createIndex({ status: 1 });
    await db.collection('usedproducts').createIndex({ category: 1 });
    await db.collection('usedproducts').createIndex({ createdAt: -1 });
    
    // Property indexes
    await db.collection('properties').createIndex({ status: 1 });
    await db.collection('properties').createIndex({ city: 1 });
    await db.collection('properties').createIndex({ propertyType: 1 });
    
    logger.info('✅ Database indexes created successfully');
  } catch (error) {
    logger.error('❌ Error creating database indexes:', error);
  }
};

module.exports = addDatabaseIndexes;
