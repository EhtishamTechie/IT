const mongoose = require('mongoose');
require('dotenv').config();

// PaymentAccount model
const paymentAccountSchema = new mongoose.Schema({
  title: { type: String, required: true },
  accountNumber: { type: String, required: true },
  paymentType: { type: String, enum: ['JazzCash', 'EasyPaisa', 'Bank Transfer'] },
  qrCode: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  instructions: { type: String }
}, {
  timestamps: true
});

const PaymentAccount = mongoose.model('PaymentAccount', paymentAccountSchema);

async function fixQrCodePaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all payment accounts
    const accounts = await PaymentAccount.find({});
    console.log(`📋 Found ${accounts.length} payment accounts`);

    for (const account of accounts) {
      console.log(`\n🔍 Checking account: ${account.title}`);
      console.log(`   Current QR path: ${account.qrCode}`);
      console.log(`   QR path type: ${typeof account.qrCode}`);
      console.log(`   QR path includes backslash: ${account.qrCode.includes('\\')}`);
      console.log(`   QR path includes forward slash: ${account.qrCode.includes('/')}`);
      
      // Check if the path contains 'payment-qr-codes' and update it
      if (account.qrCode && account.qrCode.includes('payment-qr-codes')) {
        const newPath = account.qrCode.replace('payment-qr-codes', 'qr-codes');
        console.log(`   🔄 Updating to: ${newPath}`);
        
        await PaymentAccount.updateOne(
          { _id: account._id },
          { qrCode: newPath }
        );
        console.log('   ✅ Updated successfully');
      } else {
        console.log('   ℹ️  Path already correct');
      }
    }

    console.log('\n🎉 QR code path fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixQrCodePaths();