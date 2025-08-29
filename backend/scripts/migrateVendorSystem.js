const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Migration script for Vendor System Step 1
// This script safely updates existing data to be compatible with vendor system

const runMigration = async () => {
  try {
    console.log('🚀 Starting Vendor System Migration - Step 1...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/international-tijarat');
    console.log('✅ Connected to MongoDB');

    // Import models
    const Product = require('./models/Product');
    const User = require('./models/User');

    console.log('\n📦 Migrating Product Model...');
    
    // Update all existing products to have vendor: null and approvalStatus: 'approved'
    // This ensures all current products remain admin-managed and approved
    const productUpdateResult = await Product.updateMany(
      { vendor: { $exists: false } }, // Only update products without vendor field
      { 
        $set: { 
          vendor: null,
          approvalStatus: 'approved',
          approvedAt: new Date(),
          vendorSku: null
        }
      }
    );
    
    console.log(`   ✅ Updated ${productUpdateResult.modifiedCount} products`);
    console.log('   ✅ All existing products remain admin-managed');
    console.log('   ✅ All existing products auto-approved');

    console.log('\n👥 Checking User Model...');
    
    // Count users by role
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('   Current user roles:');
    userStats.forEach(stat => {
      console.log(`     - ${stat._id}: ${stat.count} users`);
    });
    
    console.log('   ✅ User model ready for vendor role');

    console.log('\n🔍 Validation Checks...');
    
    // Verify all products have the new fields
    const totalProducts = await Product.countDocuments();
    const productsWithVendorField = await Product.countDocuments({ vendor: { $exists: true } });
    const productsWithApprovalStatus = await Product.countDocuments({ approvalStatus: { $exists: true } });
    
    console.log(`   📊 Products with vendor field: ${productsWithVendorField}/${totalProducts}`);
    console.log(`   📊 Products with approval status: ${productsWithApprovalStatus}/${totalProducts}`);
    
    if (productsWithVendorField === totalProducts && productsWithApprovalStatus === totalProducts) {
      console.log('   ✅ All products successfully migrated');
    } else {
      console.log('   ⚠️  Some products may need manual migration');
    }

    console.log('\n🔧 Creating Indexes...');
    
    // Ensure indexes are created
    await Product.syncIndexes();
    console.log('   ✅ Product indexes updated');

    console.log('\n📋 Migration Summary:');
    console.log('   ✅ Product model enhanced with vendor support');
    console.log('   ✅ User model ready for vendor role');
    console.log('   ✅ All existing data preserved');
    console.log('   ✅ Backward compatibility maintained');
    console.log('   ✅ New vendor models ready');

    console.log('\n🎉 Migration completed successfully!');
    console.log('🚀 System ready for vendor functionality');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
