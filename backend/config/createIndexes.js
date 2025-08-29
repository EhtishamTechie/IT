const mongoose = require('mongoose');

// Database Indexes for High Performance Queries
const createDatabaseIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes for production performance...');

    // Order Collection Indexes
    await mongoose.connection.collection('orders').createIndexes([
      { key: { orderNumber: 1 }, unique: true, background: true },
      { key: { email: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { orderType: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { vendor: 1, status: 1 }, background: true },
      { key: { paymentStatus: 1 }, background: true },
      { key: { "cart.vendor": 1 }, background: true, sparse: true },
      { key: { isForwardedToVendors: 1 }, background: true },
      // Compound index for admin order queries
      { key: { orderType: 1, status: 1, createdAt: -1 }, background: true },
    ]);

    // Product Collection Indexes
    await mongoose.connection.collection('products').createIndexes([
      { key: { title: "text", description: "text" }, background: true },
      { key: { mainCategory: 1 }, background: true },
      { key: { subCategory: 1 }, background: true },
      { key: { vendor: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { stock: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      // Compound indexes for filtering
      { key: { mainCategory: 1, isActive: 1, price: 1 }, background: true },
      { key: { vendor: 1, isActive: 1, createdAt: -1 }, background: true },
    ]);

    // User Collection Indexes
    await mongoose.connection.collection('users').createIndexes([
      { key: { email: 1 }, unique: true, background: true },
      { key: { role: 1 }, background: true },
      { key: { isActive: 1 }, background: true },
    ]);

    // Vendor Collection Indexes
    await mongoose.connection.collection('vendors').createIndexes([
      { key: { email: 1 }, unique: true, background: true },
      { key: { businessName: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { isApproved: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { "settings.commissionRate": 1 }, background: true, sparse: true },
    ]);

    // VendorOrder Collection Indexes
    await mongoose.connection.collection('vendororders').createIndexes([
      { key: { parentOrderId: 1 }, background: true },
      { key: { vendor: 1, status: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { forwardedAt: 1 }, background: true, sparse: true },
    ]);

    // Commission Collections Indexes
    await mongoose.connection.collection('monthlycommissions').createIndexes([
      { key: { vendorId: 1, year: 1, month: 1 }, unique: true, background: true },
      { key: { paymentStatus: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ]);

    // Category Collection Indexes
    await mongoose.connection.collection('categories').createIndexes([
      { key: { name: 1 }, unique: true, background: true },
      { key: { isActive: 1 }, background: true },
    ]);

    // Contact Collection Indexes
    await mongoose.connection.collection('contacts').createIndexes([
      { key: { email: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ]);

    // Used Products Collection Indexes
    await mongoose.connection.collection('usedproducts').createIndexes([
      { key: { seller: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { category: 1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ]);

    // Properties Collection Indexes
    await mongoose.connection.collection('properties').createIndexes([
      { key: { seller: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { propertyType: 1 }, background: true },
      { key: { location: 1 }, background: true },
      { key: { price: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
    ]);

    console.log('✅ Database indexes created successfully');
    return true;

  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    return false;
  }
};

// Run index creation
const runIndexCreation = async () => {
  if (mongoose.connection.readyState === 1) {
    await createDatabaseIndexes();
  } else {
    mongoose.connection.once('connected', async () => {
      await createDatabaseIndexes();
    });
  }
};

module.exports = { createDatabaseIndexes, runIndexCreation };
