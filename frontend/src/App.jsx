import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Create helmet context for react-helmet-async
const helmetContext = {};
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { AdminProvider } from './contexts/AdminContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import NotificationProvider from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AllProductsPage from './pages/AllProductsPage';
import GroupCategoryPage from './pages/GroupCategoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ContactUsPage from './pages/ContactUsPage';
import AboutUsPage from './pages/AboutUsPage';
import BlogPage from './pages/BlogPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import UserProfilePage from './pages/UserProfilePage';
import OrderHistoryPage from './pages/OrderHistoryPage';
// NEW: Simple order components to fix blinking issues
import SimpleOrderHistoryPage from './pages/SimpleOrderHistoryPage';
import SimpleOrderDetailPage from './pages/SimpleOrderDetailPage';
import ComingSoon from './components/ComingSoon';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import TrackOrderPage from './pages/TrackOrderPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/Admin/AdminPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import VendorRegisterPage from './pages/Vendor/VendorRegisterPage';
import VendorLoginPage from './pages/Vendor/VendorLoginPage';
import VendorDashboardPage from './pages/Vendor/VendorDashboardPage';
import VendorCategoriesPage from './pages/Vendor/VendorCategoriesPage';
import VendorProductsPage from './pages/Vendor/VendorProductsPage_clean';
import VendorProfilePageOptimized from './pages/Vendor/VendorProfilePageOptimized';
import AddProductPage from './pages/Vendor/AddProductPage';
import EditProductPage from './pages/Vendor/EditProductPage';
import BulkProductsPage from './pages/Vendor/BulkProductsPage';
import ProductAnalyticsPage from './pages/Vendor/ProductAnalyticsPage';
import VendorOrdersPage from './pages/Vendor/VendorOrdersPage';
import SimplifiedVendorOrdersPage from './pages/Vendor/SimplifiedVendorOrdersPage';
import EnhancedVendorOrdersPage from './pages/Vendor/EnhancedVendorOrdersPage';
import VendorCommissionPage from './pages/Vendor/VendorCommissionPage';
import OrderDetailPage from './pages/Vendor/OrderDetailPage';
import OrderAnalyticsPage from './pages/Vendor/OrderAnalyticsPage';
import VendorAnalyticsPage from './pages/Vendor/VendorAnalyticsPage_OPTIMIZED';
import SalesReportsPage from './pages/Vendor/SalesReportsPage';
import PerformanceDashboardPage from './pages/Vendor/PerformanceDashboardPage';
import CustomerInquiriesPage from './pages/Vendor/CustomerInquiriesPage';
import InquiryDetailPage from './pages/Vendor/InquiryDetailPage';
import ContactPage from './pages/ContactPage';
import ApplicationStatusPage from './pages/Vendor/ApplicationStatusPage';
import InventoryManagement from './pages/Vendor/InventoryManagement';
import VendorApplicationsPage from './pages/Admin/VendorApplicationsPage';
import VendorApplicationDetailPage from './pages/Admin/VendorApplicationDetailPage';
import VendorMarketplacePage from './pages/VendorMarketplacePage';
import UsedProducts from './pages/UsedProducts';
import SellUsedProduct from './pages/SellUsedProduct';
import UsedProductDetailPage from './pages/UsedProductDetailPage';
import SellerProductDetailPage from './pages/SellerProductDetailPage';
// Property Pages
import Properties from './pages/Properties';
import SellProperty from './pages/SellProperty';
import PropertyDetailPage from './pages/PropertyDetailPage';
// Wholesale Pages
import ContactWholeseller from './pages/ContactWholeseller';
import WholesaleManagement from './pages/Admin/WholesaleManagement';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import VendorProtectedRoute from './components/Vendor/VendorProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

// Component to handle conditional navbar rendering
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isVendorRoute = location.pathname.startsWith('/vendor');

  return (
    <div className={isAdminRoute ? 'admin-layout' : isVendorRoute ? 'vendor-layout' : 'main-website'}>
      {/* Only show navbar if NOT on admin or vendor routes */}
      {!isAdminRoute && !isVendorRoute && <Navbar />}
      
      {/* ScrollToTop component to handle automatic scrolling on route changes */}
      <ScrollToTop />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<AllProductsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/marketplace" element={<VendorMarketplacePage />} />
        <Route path="/category-group/:groupName" element={<GroupCategoryPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
        <Route path="/track-order/:orderNumber" element={<TrackOrderPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/ContactUsPage" element={<ContactUsPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/AboutUsPage" element={<AboutUsPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/BlogPage" element={<BlogPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsConditionsPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="/simple-order-history" element={<SimpleOrderHistoryPage />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <SimpleOrderHistoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/order/:orderId" 
          element={<SimpleOrderDetailPage />} 
        />
        
        {/* Used Products Routes */}
        <Route path="/used-products" element={<UsedProducts />} />
        <Route path="/used-products/:id" element={<UsedProductDetailPage />} />
        <Route 
          path="/sell-used-products" 
          element={
            <ProtectedRoute>
              <SellUsedProduct />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/seller/product/:id" 
          element={
            <ProtectedRoute>
              <SellerProductDetailPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Property Routes */}
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:id" element={<PropertyDetailPage />} />
        <Route 
          path="/sell-property" 
          element={
            <ProtectedRoute>
              <SellProperty />
            </ProtectedRoute>
          } 
        />
        
        {/* Wholesale Routes */}
        <Route path="/contact-wholeseller" element={<ContactWholeseller />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route 
          path="/admin/*" 
          element={
            <AdminProtectedRoute>
              <AdminPage />
            </AdminProtectedRoute>
          } 
        />

        {/* Vendor Routes */}
        <Route path="/vendor/register" element={<VendorRegisterPage />} />
        <Route path="/vendor/login" element={<VendorLoginPage />} />
        <Route 
          path="/vendor/dashboard" 
          element={
            <VendorProtectedRoute>
              <VendorDashboardPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/categories" 
          element={
            <VendorProtectedRoute>
              <VendorCategoriesPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/profile" 
          element={
            <VendorProtectedRoute>
              <VendorProfilePageOptimized />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/products" 
          element={
            <VendorProtectedRoute>
              <VendorProductsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/products/add" 
          element={
            <VendorProtectedRoute>
              <AddProductPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/products/:id/edit" 
          element={
            <VendorProtectedRoute>
              <EditProductPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/products/bulk" 
          element={
            <VendorProtectedRoute>
              <BulkProductsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/products/:id/analytics" 
          element={
            <VendorProtectedRoute>
              <ProductAnalyticsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/orders" 
          element={
            <VendorProtectedRoute>
              <SimplifiedVendorOrdersPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/orders/original" 
          element={
            <VendorProtectedRoute>
              <VendorOrdersPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/orders/enhanced" 
          element={
            <VendorProtectedRoute>
              <EnhancedVendorOrdersPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/commissions" 
          element={
            <VendorProtectedRoute>
              <VendorCommissionPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/orders/analytics" 
          element={
            <VendorProtectedRoute>
              <OrderAnalyticsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/orders/:id" 
          element={
            <VendorProtectedRoute>
              <OrderDetailPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/analytics" 
          element={
            <VendorProtectedRoute>
              <VendorAnalyticsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/reports" 
          element={
            <VendorProtectedRoute>
              <SalesReportsPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/performance" 
          element={
            <VendorProtectedRoute>
              <PerformanceDashboardPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/inquiries" 
          element={
            <VendorProtectedRoute>
              <CustomerInquiriesPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/inquiries/:inquiryId" 
          element={
            <VendorProtectedRoute>
              <InquiryDetailPage />
            </VendorProtectedRoute>
          } 
        />
        <Route 
          path="/vendor/inventory" 
          element={
            <VendorProtectedRoute>
              <InventoryManagement />
            </VendorProtectedRoute>
          } 
        />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/vendor/application-status" element={<ApplicationStatusPage />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <AdminProvider>
              <AdminAuthProvider>
                <VendorAuthProvider>
                  <NotificationProvider>
                    <CartProvider>
                      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <AppContent />
                      </Router>
                    </CartProvider>
                  </NotificationProvider>
                </VendorAuthProvider>
              </AdminAuthProvider>
            </AdminProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
