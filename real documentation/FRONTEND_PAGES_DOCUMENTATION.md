# Frontend Pages Documentation

## Overview
This document contains comprehensive information about all frontend pages and functionalities in the International Tijarat website, including file names, endpoints, logic, connectivity, and implementation details.

## Table of Contents
1. [Vendor Dashboard](#vendor-dashboard)
2. [Admin Panel](#admin-panel)
3. [Customer Interface](#customer-interface)
4. [Authentication Pages](#authentication-pages)
5. [Product Management](#product-management)
6. [Order Management](#order-management)
7. [Commission System](#commission-system)
8. [Analytics & Reports](#analytics--reports)

---

## Vendor Dashboard

## Vendor Dashboard

### Dashboard Statistics Tab

- **Files Used**: 
  - Frontend: `frontend/src/pages/Vendor/VendorDashboardPage.jsx`
  - Service: `frontend/src/services/vendorService.js`
  - Layout: `frontend/src/components/Vendor/VendorLayout.jsx`
  - Backend: `backend/controllers/vendorAuthController.js` (lightweight endpoint)

- **Endpoints**: 
  - `GET /api/vendors/orders` - Fetches all vendor orders
  - `GET /api/vendors/products` - Fetches all vendor products  
  - `GET /api/vendors/categories` - Fetches vendor categories
  - `GET /api/vendors/dashboard` - Lightweight endpoint (no calculations)

- **Logic**: 
  - **Frontend-Based Calculations**: All statistics calculated directly from real data on frontend
  - **Performance Optimized**: Backend calculations removed to eliminate server load
  - **Orders Statistics**: Total, completed, pending, cancelled orders with accurate counts
  - **Products Statistics**: Total products, value, sold this month, low stock alerts
  - **Categories Statistics**: Main categories and all categories from actual products
  - **Revenue Statistics**: Total and monthly revenue (10% commission deducted automatically)
  - **Customer Insights**: Unique customers and monthly active customers
  - **Performance Metrics**: Conversion rate, monthly growth, average rating

- **Connectivity**: 
  - Uses `useVendorAuth` context for vendor authentication
  - Direct API calls to fetch real vendor data (orders, products, categories)
  - Frontend calculation eliminates backend aggregation issues
  - Lightweight backend dashboard endpoint for minimal vendor info only
  - Real-time accuracy from actual data sources

- **Enhanced Dashboard Cards Layout**:
  1. **Orders Card**: Total, completed, pending, cancelled (4 metrics)
  2. **Products Card**: Total, value, sold this month, low stock (4 metrics)
  3. **Categories Card**: Main categories, all categories (2 metrics)
  4. **Revenue Card**: Total revenue, monthly revenue, avg order value (3 metrics)
  5. **Customer Insights Card**: Total customers, active this month (2 metrics) - NEW
  6. **Performance Metrics Card**: Conversion rate, monthly growth, rating (3 metrics) - NEW

- **Issues & Improvements**: 
  - ✅ **MAJOR UPDATE**: Complete frontend-based calculation system implemented
  - ✅ **PERFORMANCE**: Backend calculation logic removed for optimal performance
  - ✅ **FIXED**: Double-counting issues eliminated by using real data sources
  - ✅ **ENHANCED**: 6 statistical cards with comprehensive business insights (was 5)
  - ✅ **NEW**: Customer insights card with unique customer tracking
  - ✅ **NEW**: Performance metrics card with conversion rate and growth
  - ✅ **IMPROVED**: Product card enhanced with low stock alerts  
  - ✅ **IMPROVED**: Revenue card enhanced with average order value
  - ✅ **IMPROVED**: Orders card enhanced with pending orders count
  - ✅ **OPTIMIZED**: No backend aggregation needed - better performance
  - ✅ **RELIABLE**: Always accurate data from real vendor sources
  - 🔄 **PENDING**: Average rating calculation from actual reviews
  - 🔄 **PENDING**: Real-time updates without page refresh 

---

## Admin Panel

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Customer Interface

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Authentication Pages

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Product Management

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Order Management

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Commission System

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Analytics & Reports

### Files Used
- **Main Files**: 
- **Endpoints**: 
- **Logic**: 
- **Connectivity**: 

---

## Notes
- This document will be continuously updated as we analyze and document each frontend component
- Each section will include detailed information about files, endpoints, logic, and potential improvements
- Focus will be on maintaining simplicity while enhancing functionality
