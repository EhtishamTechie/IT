const mongoose = require('mongoose');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Vendor = require('../models/Vendor');
require('dotenv').config();

const syncProductsWithInventory = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Get all products that don't have inventory records
    const products = await Product.find({}).populate('vendor');
    console.log(`Found ${products.length} products to check`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      try {
        // Check if inventory record already exists
        const existingInventory = await Inventory.findOne({
          product: product._id,
          vendor: product.vendor
        });

        if (existingInventory) {
          console.log(`Skipping ${product.title} - inventory already exists`);
          skippedCount++;
          continue;
        }

        // Create inventory record
        const inventoryData = {
          product: product._id,
          vendor: product.vendor || product.createdBy, // Use vendor field or fallback to createdBy
          currentStock: product.stock || 0,
          lowStockThreshold: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          costPrice: product.price * 0.7, // Default cost price (70% of selling price)
          warehouseLocation: {
            warehouse: 'Main Warehouse',
            aisle: 'A',
            shelf: '1',
            bin: '001'
          }
        };

        const inventory = new Inventory(inventoryData);
        await inventory.save();

        console.log(`Created inventory record for: ${product.title}`);
        syncedCount++;

        // Add initial stock movement if there's stock
        if (product.stock > 0) {
          await inventory.addStockMovement({
            type: 'adjustment',
            quantity: product.stock,
            reason: 'Initial stock import from product data',
            performedBy: product.vendor || product.createdBy
          });
        }
      } catch (error) {
        console.error(`Error syncing product ${product.title}:`, error.message);
      }
    }

    console.log('\n=== Sync Summary ===');
    console.log(`Total products checked: ${products.length}`);
    console.log(`Synced to inventory: ${syncedCount}`);
    console.log(`Already had inventory: ${skippedCount}`);
    console.log('Sync completed successfully!');

  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run the sync
syncProductsWithInventory();
