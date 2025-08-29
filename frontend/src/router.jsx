import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
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
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AdminPage from './pages/Admin/AdminPage';
import AdminLoginPage from './pages/Admin/AdminLoginPage';
import HomepageManagement from './pages/admin/homepage';
import BannerManagement from './pages/admin/homepage/BannerManagement';
import VendorApplicationsPage from './pages/Admin/VendorApplicationsPage';
import VendorApplicationDetailPage from './pages/Admin/VendorApplicationDetailPage';
import WholesaleManagement from './pages/Admin/WholesaleManagement';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout></RootLayout>,
    children: [
      {
        index: true,
        element: <Home></Home>
      },
      {
        path: 'products',
        element: <AllProductsPage></AllProductsPage>
  },
      {
        path: 'category-group/:groupName',
        element: <GroupCategoryPage></GroupCategoryPage>
      },
  {
    path: '/product/:id',
    element: <ProductDetailPage />,
  },
  {
    path: '/cart',
    element: <CartPage />,
  },
  {
    path: '/checkout',
    element: <CheckoutPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/contact',
    element: <ContactUsPage />,
  },
  {
    path: '/about',
    element: <AboutUsPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/order-confirmation/:orderNumber',
    element: <OrderConfirmationPage />,
  },
  {
    path: '/track-order/:orderNumber',
    element: <TrackOrderPage />,
  },
  {
    path: '/track-order',
    element: <TrackOrderPage />,
  },
  // Admin Routes
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
    children: [
      {
        path: 'homepage',
        element: <HomepageManagement />,
        children: [
          {
            path: 'banners',
            element: <BannerManagement />,
          },
        ],
      },
      {
        path: 'vendor-applications',
        element: <VendorApplicationsPage />,
      },
      {
        path: 'vendor-applications/:id',
        element: <VendorApplicationDetailPage />,
      },
      {
        path: 'wholesale',
        element: <WholesaleManagement />,
      }
    ]
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});
