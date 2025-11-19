# Facebook Product Catalog - Quick Start

## ✅ What's Been Created

Your Facebook product catalog system is now ready! Here's what you have:

### 📁 Location
`/catalogue/` folder in your project root

### 📄 Files Created
1. **export-catalog-simple.js** - Main export script
2. **facebook-product-catalog.csv** - Your product catalog (213 products)
3. **export-summary.json** - Export statistics
4. **run-export.bat** - Double-click to run export (Windows)
5. **README.md** - Complete documentation
6. **.gitignore** - Protects your CSV from being committed

## 🚀 How to Use

### Method 1: Double-Click (Easiest)
1. Open the `catalogue` folder
2. Double-click `run-export.bat`
3. Wait for completion
4. CSV file is ready!

### Method 2: Command Line
```bash
# From project root
node catalogue/export-catalog-simple.js
```

## 📤 Upload to Facebook

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to **Commerce Manager** → **Catalog**
3. Click **Data Sources** → **Add Items** → **Upload Data**
4. Upload: `catalogue/facebook-product-catalog.csv`
5. Done! Your products are now in Facebook Catalog

## 📊 Current Export Stats

- **Total Products:** 213
- **File Size:** 229.10 KB
- **Export Date:** November 10, 2025
- **Format:** Facebook Catalog Standard

## 🔄 When to Re-Export

Run the export again whenever you:
- Add new products
- Update product prices
- Change product descriptions
- Update product images
- Want to refresh Facebook catalog

Simply double-click `run-export.bat` or run the command again!

## ✨ CSV Format

Your CSV includes all required Facebook fields:

| Field | Description | Example |
|-------|-------------|---------|
| id | Unique product ID | prod_68d960adcc81a9eeccd92e17 |
| title | Product name | Empire Body Spray 200ml |
| description | Full description | Alcohol Denat, Butane... |
| availability | Stock status | in stock |
| condition | Product condition | new |
| price | Price with currency | 599.00 USD |
| link | Mobile product page | https://m.internationaltijarat.com/product/... |
| image_link | Product image URL | https://internationaltijarat.com/uploads/... |
| brand | Brand name | International Tijarat |
| google_pr_ctgn | Category | Apparel & Accessories |
| item_group_id | Product grouping | group_1 |

## 🎯 Features

✅ Only exports active & visible products  
✅ Cleans HTML from descriptions  
✅ Uses mobile-optimized URLs  
✅ Applies discount prices automatically  
✅ Handles special characters properly  
✅ CSV-compliant formatting  
✅ Fast export (runs in seconds)  
✅ Automatic grouping for variants

## 📝 Notes

- The script connects to your production MongoDB database
- Only products with `isActive: true` and `isVisible: true` are exported
- Product descriptions are cleaned (no HTML tags)
- All prices are in USD
- Images use your product upload folder

## 🔐 Security

- CSV file is not tracked in Git (.gitignore)
- Safe to run anytime
- No data modification (read-only)
- Uses existing database credentials

## ❓ Need Help?

If you encounter any issues:
1. Make sure backend is configured (`.env` file exists)
2. Check MongoDB connection
3. Verify products exist in database
4. Check console output for errors

---

**Ready to advertise on Facebook!** 🎉

Upload your CSV and start running Facebook Catalog Ads to reach more customers.
