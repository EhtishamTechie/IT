import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  Store,
  DollarSign,
  TrendingUp,
  Recycle,
  Home,
  Truck,
  MessageSquare,
  LayoutGrid
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { AdminAuthProvider } from '../../contexts/AdminAuthContext';
import AdminDashboard from './AdminDashboard';
import ProductManagement from './ProductManagement';
import OrderManagement from './OrderManagement';
import EnhancedOrderManagement from './EnhancedOrderManagement';
import CommissionDashboard from './CommissionDashboard';
import UserManagement from './UserManagement';
import UserProfile from './UserProfile';
import CategoryManagement from './CategoryManagement';
import AdminManagement from './AdminManagement';
import VendorApplicationsPage from './VendorApplicationsPage';
import VendorApplicationDetailPage from './VendorApplicationDetailPage';
import VendorManagement from './VendorManagement';
import VendorDetailPage from './VendorDetailPage';
import VendorDashboardView from './VendorDashboardView';
import UsedProductManagement from './UsedProductManagement';
import UsedProductDetail from './UsedProductDetail';
import PropertyManagement from './PropertyManagement';
import PropertyDetail from './PropertyDetail';
import WholesaleManagement from './WholesaleManagement';
import FeedbackManagement from './FeedbackManagement';
import HomepageManagement from './homepage';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { adminLogout, adminUser } = useAdmin();

  // Check if we're on a user profile page
  const isUserProfilePage = location.pathname.includes('/admin/users/') && location.pathname !== '/admin/users';

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname.replace('/admin/', '').split('/')[0] || 'dashboard';
    setActiveTab(path);
  }, [location.pathname]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { id: 'homepage', label: 'Homepage', icon: LayoutGrid, path: '/admin/homepage' },
    { id: 'products', label: 'Products', icon: Package, path: '/admin/products' },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart, path: '/admin/orders' },
    { id: 'multi-vendor-orders', label: 'Vendor Orders', icon: TrendingUp, path: '/admin/multi-vendor-orders' },
    { id: 'used-products', label: 'Used Products', icon: Recycle, path: '/admin/used-products' },
    { id: 'properties', label: 'Property Listings', icon: Home, path: '/admin/properties' },
    { id: 'wholesale', label: 'Wholesale Suppliers', icon: Truck, path: '/admin/wholesale' },
    { id: 'commissions', label: 'Commission Management', icon: DollarSign, path: '/admin/commissions' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    { id: 'vendor-applications', label: 'Vendor Applications', icon: Store, path: '/admin/vendor-applications' },
    { id: 'vendors', label: 'Vendors', icon: Store, path: '/admin/vendors' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, path: '/admin/feedback' },
    { id: 'categories', label: 'Categories', icon: Tag, path: '/admin/categories' },
    { id: 'admins', label: 'Admin Management', icon: Shield, path: '/admin/admins' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const handleBackToWebsite = () => {
    navigate('/');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      adminLogout();
      navigate('/admin/login');
    }
  };

  const handleMenuClick = (item) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    return (
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="orders" element={<OrderManagement />} />
        <Route path="multi-vendor-orders" element={<EnhancedOrderManagement />} />
        <Route path="used-products" element={<UsedProductManagement />} />
        <Route path="used-products/:productId" element={<UsedProductDetail />} />
        <Route path="properties" element={<PropertyManagement />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="wholesale" element={<WholesaleManagement />} />
        <Route path="commissions" element={<CommissionDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="users/:userId" element={<UserProfile />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="vendors" element={<VendorManagement />} />
        <Route path="vendors/:id" element={<VendorDetailPage />} />
        <Route path="vendor-dashboard/:vendorId" element={<VendorDashboardView />} />
        <Route path="vendor-applications" element={<VendorApplicationsPage />} />
        <Route path="vendor-applications/:id" element={<VendorApplicationDetailPage />} />
        <Route path="feedback" element={<FeedbackManagement />} />
        <Route path="homepage" element={<HomepageManagement />} />
        <Route path="settings" element={
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Settings panel coming soon...</p>
          </div>
        } />
      </Routes>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Professional Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex-shrink-0 flex flex-col`}>
        {/* Enhanced Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-blue-100 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Enhanced Admin User Info */}
        {adminUser && (
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">
                  {adminUser.firstName ? adminUser.firstName.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {adminUser.firstName || 'Admin'} {adminUser.lastName || ''}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  System Administrator
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = (item.id === 'dashboard' && (activeTab === 'dashboard' || activeTab === '')) || 
                           (item.id !== 'dashboard' && activeTab === item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-blue-500 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`mr-3 transition-colors duration-200 ${
                  isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Enhanced Footer Actions */}
        <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
          {/* Back to Website Button */}
          <div className="px-3 mb-3">
            <button
              onClick={handleBackToWebsite}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-green-700 rounded-lg hover:bg-green-50 hover:text-green-800 transition-all duration-200"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              Back to Website
            </button>
          </div>
          
          {/* Logout Button */}
          <div className="px-3 mb-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-700 rounded-lg hover:bg-red-50 hover:text-red-800 transition-all duration-200"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Enhanced Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="hidden sm:block">
                <h2 className="text-lg font-semibold text-gray-900">
                  {menuItems.find(item => 
                    (item.id === 'dashboard' && (activeTab === 'dashboard' || activeTab === '')) || 
                    (item.id !== 'dashboard' && activeTab === item.id)
                  )?.label || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isUserProfilePage ? 'User Profile Details' : 'Manage your system efficiently'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Back to Website Button */}
              <button
                onClick={handleBackToWebsite}
                className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:text-green-800 transition-all duration-200"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Back to Website
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminPage;
