import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Phase 4.3: Optimized QueryClient with balanced caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds - refresh often to show admin changes quickly
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache (formerly cacheTime)
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnReconnect: false, // Reduce unnecessary refetches
      refetchOnMount: true, // Always check for fresh data on mount
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
import useAnalytics from './hooks/useAnalytics';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

// Loading component for better UX
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-orange-200 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-orange-600 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="text-gray-600 text-sm font-medium">Loading page...</p>
    </div>
  </div>
);

// CRITICAL: Only load Home page immediately, lazy load everything else
import Home from './pages/Home';

// Lazy load ALL other pages for optimal performance
// Public Pages
const AllProductsPage = lazy(() => import('./pages/AllProductsPage'));
const GroupCategoryPage = lazy(() => import('./pages/GroupCategoryPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsConditionsPage = lazy(() => import('./pages/TermsConditionsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const VendorMarketplacePage = lazy(() => import('./pages/VendorMarketplacePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const ComingSoon = lazy(() => import('./components/ComingSoon'));

// User Pages
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const SimpleOrderHistoryPage = lazy(() => import('./pages/SimpleOrderHistoryPage'));
const SimpleOrderDetailPage = lazy(() => import('./pages/SimpleOrderDetailPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));

// Used Products Pages
const UsedProducts = lazy(() => import('./pages/UsedProducts'));
const SellUsedProduct = lazy(() => import('./pages/SellUsedProduct'));
const UsedProductDetailPage = lazy(() => import('./pages/UsedProductDetailPage'));
const SellerProductDetailPage = lazy(() => import('./pages/SellerProductDetailPage'));

// Property Pages
const Properties = lazy(() => import('./pages/Properties'));
const SellProperty = lazy(() => import('./pages/SellProperty'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));

// Wholesale Pages
const ContactWholeseller = lazy(() => import('./pages/ContactWholeseller'));

// Admin Pages - Lazy load to avoid loading in main bundle
const AdminPage = lazy(() => import('./pages/Admin/AdminPage'));
const AdminLoginPage = lazy(() => import('./pages/Admin/AdminLoginPage'));

// Vendor Pages - Lazy load all vendor pages
const VendorRegisterPage = lazy(() => import('./pages/Vendor/VendorRegisterPage'));
const VendorLoginPage = lazy(() => import('./pages/Vendor/VendorLoginPage'));
const VendorDashboardPage = lazy(() => import('./pages/Vendor/VendorDashboardPage'));
const VendorCategoriesPage = lazy(() => import('./pages/Vendor/VendorCategoriesPage'));
const VendorProductsPage = lazy(() => import('./pages/Vendor/VendorProductsPage_clean'));
const VendorProfilePageOptimized = lazy(() => import('./pages/Vendor/VendorProfilePageOptimized'));
const AddProductPage = lazy(() => import('./pages/Vendor/AddProductPage'));
const EditProductPage = lazy(() => import('./pages/Vendor/EditProductPage'));
const BulkProductsPage = lazy(() => import('./pages/Vendor/BulkProductsPage'));
const ProductAnalyticsPage = lazy(() => import('./pages/Vendor/ProductAnalyticsPage'));
const SimplifiedVendorOrdersPage = lazy(() => import('./pages/Vendor/SimplifiedVendorOrdersPage'));
const VendorOrdersPage = lazy(() => import('./pages/Vendor/VendorOrdersPage'));
const EnhancedVendorOrdersPage = lazy(() => import('./pages/Vendor/EnhancedVendorOrdersPage'));
const VendorCommissionPage = lazy(() => import('./pages/Vendor/VendorCommissionPage'));
const OrderDetailPage = lazy(() => import('./pages/Vendor/OrderDetailPage'));
const OrderAnalyticsPage = lazy(() => import('./pages/Vendor/OrderAnalyticsPage'));
const VendorAnalyticsPage = lazy(() => import('./pages/Vendor/VendorAnalyticsPage_OPTIMIZED'));
const SalesReportsPage = lazy(() => import('./pages/Vendor/SalesReportsPage'));
const PerformanceDashboardPage = lazy(() => import('./pages/Vendor/PerformanceDashboardPage'));
const CustomerInquiriesPage = lazy(() => import('./pages/Vendor/CustomerInquiriesPage'));
const InquiryDetailPage = lazy(() => import('./pages/Vendor/InquiryDetailPage'));
const ApplicationStatusPage = lazy(() => import('./pages/Vendor/ApplicationStatusPage'));
const InventoryManagement = lazy(() => import('./pages/Vendor/InventoryManagement'));

// Protected Route Components
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const AdminProtectedRoute = lazy(() => import('./components/AdminProtectedRoute'));
const VendorProtectedRoute = lazy(() => import('./components/Vendor/VendorProtectedRoute'));

// Component to handle conditional navbar rendering
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isVendorRoute = location.pathname.startsWith('/vendor');
  
  // Initialize analytics tracking
  useAnalytics();

  return (
    <div className={isAdminRoute ? 'admin-layout' : isVendorRoute ? 'vendor-layout' : 'main-website'}>
      {/* Only show navbar if NOT on admin or vendor routes */}
      {!isAdminRoute && !isVendorRoute && <Navbar />}
      
      {/* ScrollToTop component to handle automatic scrolling on route changes */}
      <ScrollToTop />
      
      <Suspense fallback={<PageLoader />}>
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
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <SimpleOrderHistoryPage />
                </ProtectedRoute>
              </Suspense>
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
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <SellUsedProduct />
                </ProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/seller/product/:id" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <SellerProductDetailPage />
                </ProtectedRoute>
              </Suspense>
            } 
          />
          
          {/* Property Routes */}
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route 
            path="/sell-property" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <SellProperty />
                </ProtectedRoute>
              </Suspense>
            } 
          />
          
          {/* Wholesale Routes */}
          <Route path="/contact-wholeseller" element={<ContactWholeseller />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route 
            path="/admin/*" 
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminProtectedRoute>
                  <AdminPage />
                </AdminProtectedRoute>
              </Suspense>
            } 
          />

          {/* Vendor Routes */}
          <Route path="/vendor/register" element={<VendorRegisterPage />} />
          <Route path="/vendor/login" element={<VendorLoginPage />} />
          <Route 
            path="/vendor/dashboard" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorDashboardPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/categories" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorCategoriesPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/profile" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorProfilePageOptimized />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/products" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorProductsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/products/add" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <AddProductPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/products/:id/edit" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <EditProductPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/products/bulk" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <BulkProductsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/products/:id/analytics" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <ProductAnalyticsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/orders" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <SimplifiedVendorOrdersPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/orders/original" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorOrdersPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/orders/enhanced" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <EnhancedVendorOrdersPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/commissions" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorCommissionPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/orders/analytics" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <OrderAnalyticsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/orders/:id" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <OrderDetailPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/analytics" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <VendorAnalyticsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/reports" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <SalesReportsPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/performance" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <PerformanceDashboardPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/inquiries" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <CustomerInquiriesPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/inquiries/:inquiryId" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <InquiryDetailPage />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route 
            path="/vendor/inventory" 
            element={
              <Suspense fallback={<PageLoader />}>
                <VendorProtectedRoute>
                  <InventoryManagement />
                </VendorProtectedRoute>
              </Suspense>
            } 
          />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/vendor/application-status" element={<ApplicationStatusPage />} />
        </Routes>
      </Suspense>
    </div>
  );
};

function App() {
  return (
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
