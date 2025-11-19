# Facebook Product Catalog Exporter

This folder contains scripts to export product data for Facebook Catalog Ads.

## 📋 Files

- **export-catalog-simple.js** - Main export script (recommended)
- **export-facebook-catalog.js** - Alternative export script
- **facebook-product-catalog.csv** - Generated CSV file (created after running script)
- **export-summary.json** - Export statistics and metadata

## 🚀 Usage

### Run the Export Script

```bash
# From the project root directory
node catalogue/export-catalog-simple.js
```

### Output Format

The CSV file includes the following columns (Facebook Catalog format):

| Column | Description | Example |
|--------|-------------|---------|
| id | Unique product identifier | prod_673a1b2c3d4e5f6g7h8i9j0k |
| title | Product name (max 150 chars) | Premium Leather Wallet |
| description | Product description (clean, no HTML) | High quality leather wallet... |
| availability | Stock status | in stock |
| condition | Product condition | new |
| price | Product price with currency | 29.99 USD |
| link | Product page URL | https://m.internationaltijarat.com/product/premium-leather-wallet |
| image_link | Product image URL | https://internationaltijarat.com/uploads/products/wallet-1.jpg |
| brand | Product brand | International Tijarat |
| google_product_category | Product category | Apparel & Accessories |
| item_group_id | Grouping ID for variants | group_wal_1 |

## 📤 Upload to Facebook

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Navigate to **Commerce Manager** → **Catalog**
3. Select your catalog or create a new one
4. Click **Data Sources** → **Add Items**
5. Choose **Upload Data**
6. Select the generated `facebook-product-catalog.csv` file
7. Map the columns (should auto-detect)
8. Click **Upload**

## 🔄 Re-export (After Adding New Products)

Simply run the script again:

```bash
node catalogue/export-catalog-simple.js
```

The script will:
- ✅ Connect to your MongoDB database
- ✅ Fetch all active and visible products  
- ✅ Generate a fresh CSV file
- ✅ Update the export summary

**Last Export:** 213 products exported on November 10, 2025

## 🛠️ Configuration

The script uses environment variables from `.env`:

- `MONGODB_URI` - MongoDB connection string
- `FRONTEND_URL` - Base URL for product links (default: https://internationaltijarat.com)

## 📊 Features

- **Clean Data**: Removes HTML tags, handles special characters
- **Proper Escaping**: CSV-compliant formatting
- **Image Handling**: Uses first product image or fallback
- **Price Calculation**: Applies discounts if available
- **SEO-Friendly URLs**: Uses product slugs when available
- **Grouping**: Automatically groups related products

## 🔍 Troubleshooting

### Error: "MONGODB_URI not found"
Make sure `.env` file exists in project root with `MONGODB_URI` set.

### Error: "No products found"
Check that you have products with `isActive: true` and `isVisible: true` in the database.

### CSV not recognized by Facebook
Ensure file encoding is UTF-8 and columns match Facebook's requirements.

## 📝 Notes

- Only exports **active** and **visible** products
- Description limited to 5000 characters (Facebook recommendation)
- Title limited to 150 characters
- Prices shown in USD (modify script if needed)
- Mobile-optimized links (m.internationaltijarat.com)

## 🔐 Security

- Never commit the generated CSV file with sensitive data
- Keep `.env` file private
- Regularly update export for fresh data

## 📞 Support

For issues or questions, contact the development team.
