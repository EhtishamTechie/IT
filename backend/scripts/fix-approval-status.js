require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function fixApprovalStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count products without approvalStatus
    const productsWithoutStatus = await Product.countDocuments({
      $or: [
        { approvalStatus: { $exists: false } },
        { approvalStatus: undefined },
        { approvalStatus: null }
      ]
    });

    console.log(`📊 Found ${productsWithoutStatus} products without approvalStatus\n`);

    if (productsWithoutStatus > 0) {
      console.log('🔧 Setting approvalStatus to "approved" for all products without status...\n');

      const result = await Product.updateMany(
        {
          $or: [
            { approvalStatus: { $exists: false } },
            { approvalStatus: undefined },
            { approvalStatus: null }
          ]
        },
        {
          $set: { approvalStatus: 'approved' }
        }
      );

      console.log(`✅ Updated ${result.modifiedCount} products\n`);

      // Verify
      const approvedCount = await Product.countDocuments({ approvalStatus: 'approved' });
      console.log(`📊 Total approved products now: ${approvedCount}\n`);

      // Show sample
      const sample = await Product.find({ approvalStatus: 'approved' })
        .select('title approvalStatus')
        .limit(5)
        .lean();

      console.log('Sample of updated products:');
      sample.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.title} - Status: ${p.approvalStatus}`);
      });
    } else {
      console.log('✅ All products already have approvalStatus set!');
    }

    mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

fixApprovalStatus();
