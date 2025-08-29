import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { vendorService, vendorUtils, vendorAPI, getImageUrl } from '../../services/vendorService';
import config from '../../config';
import VendorLayout from '../../components/Vendor/VendorLayout';
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Star, 
  Plus, 
  Eye, 
  Users, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  CheckCircle,
  XCircle,
  Calendar,
  Grid3X3,
  Target,
  ArrowUp
} from 'lucide-react';

const VendorDashboardPage = () => {
  const { vendor, refreshVendorData } = useVendorAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if this is admin viewing
  const isAdminViewing = 
    vendor?.isAdminViewing === true || 
    sessionStorage.getItem('adminViewingVendor') === 'true' ||
    localStorage.getItem('vendorToken')?.startsWith('admin-impersonating-');

  const handleReturnToAdmin = () => {
    const originalAdminToken = sessionStorage.getItem('originalAdminToken');
    const originalAdminData = sessionStorage.getItem('originalAdminData');
    
    if (originalAdminToken) {
      // Restore admin session
      localStorage.setItem('adminToken', originalAdminToken);
      localStorage.setItem('adminData', originalAdminData || '{}');
      
      // Clear vendor session
      localStorage.removeItem('vendorToken');
      localStorage.removeItem('vendorData');
      localStorage.removeItem('vendorAuthTime');
      
      // Clear session storage
      sessionStorage.removeItem('adminViewingVendor');
      sessionStorage.removeItem('originalAdminToken');
      sessionStorage.removeItem('originalAdminData');
      sessionStorage.removeItem('viewingVendorId');
      
      // Redirect to admin panel
      window.location.href = '/admin/vendors';
    } else {
      // Fallback: just go to admin login
      window.location.href = '/admin/login';
    }
  };

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      // Refresh vendor data first to ensure we have latest info (logo, verification status)
      await refreshVendorData();
    } catch (error) {
      console.warn('Failed to refresh vendor data:', error);
    }
    
    // Then fetch dashboard data
    fetchAllDataAndCalculateStats();
  };

  const fetchAllDataAndCalculateStats = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Using optimized dashboard stats endpoint...');

      // Use optimized dashboard stats instead of fetching all orders
      const [dashboardStatsResponse, productsResponse, categoriesResponse, dashboardResponse] = await Promise.all([
        vendorAPI.getDashboardStats().catch(err => {
          console.error('❌ Dashboard Stats API failed:', err);
          return { data: null };
        }),
        vendorAPI.getVendorProducts().catch(err => {
          console.error('❌ Products API failed:', err);
          return { data: [] };
        }),
        vendorAPI.getCategories().catch(err => {
          console.error('❌ Categories API failed:', err);
          return { data: [] };
        }),
        vendorAPI.getDashboard().catch(err => {
          console.error('❌ Dashboard API failed:', err);
          return { data: { commissionRate: 20 } }; // Default fallback
        })
      ]);

      console.log('📦 Optimized Data Received:');
      console.log('   Dashboard Stats:', dashboardStatsResponse?.data);
      console.log('   Products Response:', productsResponse);
      console.log('   Categories Response:', categoriesResponse);
      console.log('   Dashboard Response:', dashboardResponse);

      // Extract the actual data with optimized stats
      let products = [];
      let categories = [];
      let commissionRate = 20; // Default fallback
      let dashboardStats = null;

      // Extract optimized dashboard statistics from backend
      if (dashboardStatsResponse?.data?.success && dashboardStatsResponse.data.data?.stats) {
        dashboardStats = dashboardStatsResponse.data.data.stats;
        console.log('📊 Using backend-calculated stats:', dashboardStats);
      } else {
        console.warn('⚠️ Dashboard stats not available, using fallback');
        dashboardStats = {
          orders: { total: 0, completed: 0, cancelled: 0, cancelledByCustomer: 0, thisMonth: 0, today: 0 },
          products: { total: 0, totalValue: 0, soldThisMonth: 0, outOfStock: 0 },
          revenue: { total: 0, thisMonth: 0, avgOrderValue: 0 },
          customers: { total: 0, thisMonth: 0 },
          performance: { conversionRate: 0, monthlyGrowth: 0 }
        };
      }

      // Extract products with proper error handling
      if (productsResponse?.data?.products) {
        products = productsResponse.data.products;
      } else if (productsResponse?.products) {
        products = productsResponse.products;
      } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
        products = productsResponse.data;
      } else if (Array.isArray(productsResponse)) {
        products = productsResponse;
      }

      // Extract categories with proper error handling (from vendor category management)
      if (categoriesResponse?.data && Array.isArray(categoriesResponse.data)) {
        categories = categoriesResponse.data;
      } else if (categoriesResponse?.categories) {
        categories = categoriesResponse.categories;
      } else if (Array.isArray(categoriesResponse)) {
        categories = categoriesResponse;
      }

      // Extract commission rate with proper error handling (from dashboard endpoint)
      if (dashboardResponse?.data?.commissionRate) {
        commissionRate = dashboardResponse.data.commissionRate;
      } else if (dashboardResponse?.commissionRate) {
        commissionRate = dashboardResponse.commissionRate;
      }

      console.log('📦 Extracted Data Arrays:');
      console.log('   Dashboard Stats:', dashboardStats);
      console.log('   Products:', products?.length || 0, products?.[0] ? 'Sample:' : 'Empty', products?.[0]);
      console.log('   Categories:', categories?.length || 0, categories?.[0] ? 'Sample:' : 'Empty', categories?.[0]);
      console.log('   Commission Rate:', commissionRate + '%');

      // Use backend-calculated statistics instead of frontend calculation
      setDashboardData({
        businessName: vendor?.businessName,
        stats: {
          // Orders - using backend calculated values
          totalOrders: dashboardStats.orders.total,
          completedOrders: dashboardStats.orders.completed,
          cancelledOrders: dashboardStats.orders.cancelled,
          cancelledByCustomer: dashboardStats.orders.cancelledByCustomer,
          thisMonthOrders: dashboardStats.orders.thisMonth,
          todayOrders: dashboardStats.orders.today,
          
          // Products - using backend calculated values
          totalProducts: dashboardStats.products.total,
          outOfStockProducts: dashboardStats.products.outOfStock,
          productValue: dashboardStats.products.totalValue,
          soldThisMonth: dashboardStats.products.soldThisMonth,
          
          // Revenue - using backend calculated values
          totalRevenue: dashboardStats.revenue.total,
          thisMonthRevenue: dashboardStats.revenue.thisMonth,
          avgOrderValue: dashboardStats.revenue.avgOrderValue,
          
          // Customers - using backend calculated values
          totalCustomers: dashboardStats.customers.total,
          thisMonthCustomers: dashboardStats.customers.thisMonth,
          
          // Performance - using backend calculated values
          completionRate: dashboardStats.performance.conversionRate,
          cancellationRate: 100 - dashboardStats.performance.conversionRate, // Calculated from conversion rate
          monthlyGrowth: dashboardStats.performance.monthlyGrowth,
          
          // Additional
          commissionRate: commissionRate,
          totalCategories: categories.length
        }
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Error loading dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchAllDataAndCalculateStats}
            className="mt-2 text-red-700 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      </VendorLayout>
    );
  }

  const stats = dashboardData?.stats || {};

  // New comprehensive dashboard cards with enhanced statistics
  const dashboardCards = [
    // 1. Orders Card (Enhanced)
    {
      title: 'Orders',
      items: [
        {
          label: 'Total Orders',
          value: stats.totalOrders || 0,
          icon: <ShoppingCart size={16} />,
          color: 'text-blue-600'
        },
        {
          label: 'Completed Orders',
          value: stats.completedOrders || 0,
          icon: <CheckCircle size={16} />,
          color: 'text-green-600'
        },
        {
          label: 'Cancelled by Customer',
          value: stats.cancelledByCustomer || 0,
          icon: <XCircle size={16} />,
          color: 'text-orange-600'
        },
        {
          label: 'Cancelled Orders',
          value: stats.cancelledOrders || 0,
          icon: <XCircle size={16} />,
          color: 'text-red-600'
        }
      ],
      link: '/vendor/orders',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    // 2. Products Card (Enhanced)
    {
      title: 'Products',
      items: [
        {
          label: 'Total Products',
          value: stats.totalProducts || 0,
          icon: <Package size={16} />,
          color: 'text-purple-600'
        },
        {
          label: 'Total Value',
          value: vendorUtils.formatCurrency(stats.productValue || 0),
          icon: <DollarSign size={16} />,
          color: 'text-green-600'
        },
        {
          label: 'Sold This Month',
          value: stats.soldThisMonth || 0,
          icon: <TrendingUp size={16} />,
          color: 'text-blue-600'
        },
        {
          label: 'Out of Stock Items',
          value: stats.outOfStockProducts || 0,
          icon: <Package size={16} />,
          color: 'text-red-600'
        }
      ],
      link: '/vendor/products',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    // 3. Revenue Card (Enhanced) - MOVED TO ROW 1
    {
      title: 'Revenue',
      items: [
        {
          label: 'Total Revenue',
          value: vendorUtils.formatCurrency(stats.totalRevenue || 0),
          icon: <DollarSign size={16} />,
          color: 'text-green-600'
        },
        {
          label: 'This Month Revenue',
          value: vendorUtils.formatCurrency(stats.thisMonthRevenue || 0),
          icon: <Calendar size={16} />,
          color: 'text-blue-600'
        },
        {
          label: 'Avg Order Value',
          value: vendorUtils.formatCurrency(stats.avgOrderValue || 0),
          icon: <TrendingUp size={16} />,
          color: 'text-purple-600'
        }
      ],
      link: '/vendor/analytics',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    // 4. Categories Card - MOVED TO ROW 2
    {
      title: 'Categories',
      items: [
        {
          label: 'Total Categories',
          value: stats.totalCategories || 0,
          icon: <Grid3X3 size={16} />,
          color: 'text-indigo-600'
        }
      ],
      link: '/vendor/categories',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    // 5. Customer Insights Card
    {
      title: 'Customers',
      items: [
        {
          label: 'Total Customers',
          value: stats.totalCustomers || 0,
          icon: <Users size={16} />,
          color: 'text-blue-600'
        },
        {
          label: 'Active This Month',
          value: stats.thisMonthCustomers || 0,
          icon: <Calendar size={16} />,
          color: 'text-green-600'
        }
      ],
      link: '/vendor/customers',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200'
    },
    // 6. Performance Metrics Card
    {
      title: 'Performance',
      items: [
        {
          label: 'Completion Rate',
          value: `${stats.completionRate || 0}%`,
          icon: <BarChart3 size={16} />,
          color: 'text-purple-600'
        },
        {
          label: 'Monthly Growth',
          value: stats.monthlyGrowth || 0,
          icon: <TrendingUp size={16} />,
          color: 'text-green-600'
        },
        {
          label: 'Cancellation Rate',
          value: `${stats.cancellationRate || 0}%`,
          icon: <XCircle size={16} />,
          color: 'text-red-600'
        }
      ],
      link: '/vendor/analytics',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];

  const recentActivities = [
    {
      type: 'product',
      message: 'New product added to catalog',
      time: '2 hours ago',
      icon: <Package size={16} />
    },
    {
      type: 'order',
      message: 'New order received',
      time: '4 hours ago',
      icon: <ShoppingCart size={16} />
    },
    {
      type: 'analytics',
      message: 'Sales report updated',
      time: '1 day ago',
      icon: <BarChart3 size={16} />
    }
  ];

  return (
    <VendorLayout>
      <div className="space-y-6">
        {/* Admin Return Button - Only show when admin is viewing */}
        {isAdminViewing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800">
                  Admin Viewing Mode - You are viewing this vendor's dashboard as an admin
                </span>
              </div>
              <button
                onClick={handleReturnToAdmin}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Admin Panel
              </button>
            </div>
          </div>
        )}
        
        {/* Clean Welcome Section with Black Accents */}
        <div className="bg-gradient-to-r from-orange-50 via-white to-orange-100 rounded-xl shadow-lg p-6 border border-orange-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-black to-gray-800 opacity-8 rounded-bl-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Vendor Logo */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-orange-200 overflow-hidden">
                    {vendor?.logo ? (
                      <img
                        src={getImageUrl(vendor.logo)}
                        alt={`${vendor?.businessName} Logo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('bg-gradient-to-br', 'from-orange-400', 'to-orange-600');
                          const letterSpan = document.createElement('span');
                          letterSpan.className = 'text-white font-bold text-lg';
                          letterSpan.textContent = vendor?.businessName?.charAt(0)?.toUpperCase() || 'V';
                          e.target.parentElement.appendChild(letterSpan);
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {vendor?.businessName?.charAt(0)?.toUpperCase() || 'V'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Welcome Text */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome back, {vendor?.businessName}!
                  </h1>
                  <p className="text-gray-600">
                    Here's what's happening with your business today
                  </p>
                </div>
              </div>
              
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status Alert */}
        {vendor?.verificationStatus !== 'approved' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Account Status: {vendor?.verificationStatus}
                </h3>
                <p className="text-sm text-yellow-700">
                  {vendor?.verificationStatus === 'pending' && 'Your account is pending approval. You\'ll be able to add products once approved.'}
                  {vendor?.verificationStatus === 'under_review' && 'Your account is currently under review. We\'ll notify you once the review is complete.'}
                  {vendor?.verificationStatus === 'rejected' && 'Your account application was rejected. Please contact support for more information.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Dashboard Cards with Black Accents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${card.borderColor} ${card.bgColor} group transform hover:scale-105 relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-black to-gray-800 opacity-5 rounded-bl-full"></div>
              <div className="p-6 relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-200">
                    {card.title}
                  </h3>
                  <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"></div>
                </div>
                <div className="space-y-4">
                  {card.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-2 rounded-lg hover:bg-white hover:bg-opacity-50 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className={`${item.color} bg-white p-1 rounded-md shadow-sm`}>
                          {item.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Tips & Recommendations with Black Accents */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-black">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-6 h-6 bg-gradient-to-r from-black to-gray-800 rounded-full mr-2"></div>
            Tips to Boost Your Sales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 mt-1">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Quality Photos</h3>
                <p className="text-sm text-gray-600">Use high-quality images to showcase your products better.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 mt-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Detailed Descriptions</h3>
                <p className="text-sm text-gray-600">Write comprehensive product descriptions with key features.</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 mt-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Fast Shipping</h3>
                <p className="text-sm text-gray-600">Offer competitive shipping options to attract more buyers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
};

export default VendorDashboardPage;
