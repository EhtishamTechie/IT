require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkNewArrivals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check total approved products
    const totalApproved = await Product.countDocuments({ approvalStatus: 'approved' });
    console.log(`📊 Total approved products: ${totalApproved}\n`);

    // Check recent products (sorted by createdAt)
    const recentProducts = await Product.find({ approvalStatus: 'approved' })
      .select('title createdAt approvalStatus')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`🆕 Recent 20 approved products (by createdAt):`);
    recentProducts.forEach((p, idx) => {
      const createdDate = new Date(p.createdAt);
      console.log(`${idx + 1}. ${p.title}`);
      console.log(`   Created: ${createdDate.toISOString()}`);
      console.log(`   Status: ${p.approvalStatus}\n`);
    });

    if (recentProducts.length === 0) {
      console.log('❌ No approved products found!');
      console.log('This could mean:');
      console.log('1. No products exist in database');
      console.log('2. All products have approvalStatus != "approved"');
      console.log('\nChecking all products regardless of status...\n');

      const anyProducts = await Product.find()
        .select('title approvalStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      console.log(`Total products (any status): ${await Product.countDocuments()}`);
      anyProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.title} - Status: ${p.approvalStatus}`);
      });
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkNewArrivals();
