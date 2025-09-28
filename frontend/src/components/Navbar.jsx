import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import ProductService from "../services/productService";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { getApiUrl } from "../config";

// Icons - maintaining your exact structure
const ShoppingCartIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const ChevronDownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const UserIcon = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
</svg>
);

const SearchIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const LocationIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 0115 0z" />
  </svg>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false); // For secondary nav dropdown
  const [searchCatOpen, setSearchCatOpen] = useState(false); // For search bar hover
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const categoriesRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const navigate = useNavigate();
  
  // Use cart and auth contexts
  const { cartStats } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { isAuthenticated: isVendorAuthenticated, vendor, logout: vendorLogout } = useVendorAuth();

  // Load categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // Use the formal categories endpoint to get all available categories
        const categoriesData = await fetch(getApiUrl('/categories'))
          .then(res => res.json());
        
        const formattedCategories = {};
        
        if (Array.isArray(categoriesData)) {
          // Build category map from actual database relationships
          const mainCategories = categoriesData.filter(cat => !cat.parentCategory);
          
          mainCategories.forEach(mainCat => {
            const subcategories = categoriesData.filter(cat => {
              const parentId = cat.parentCategory?._id || cat.parentCategory;
              return parentId === mainCat._id;
            });
            
            formattedCategories[mainCat.name] = subcategories.map(sub => sub.name);
          });
        }
        
        console.log('Navbar categories built from DB:', formattedCategories);
        setCategories(formattedCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to empty categories if API fails
        setCategories({});
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target)) {
        setCatOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Your existing data structures - maintaining exact structure
  const mainPages = [
    { label: "Home", path: "/" },
    { label: "Shop", path: "/products" },
    { label: "Buy/Sell Used Products", path: "/used-products" },
    { label: "Property Sale/Purchase", path: "/properties" },
    { label: "Wholesale Dealership", path: "/contact-wholeseller" },
    // { label: "Our Stores", path: "/stores" },
    { label: "Blog", path: "/BlogPage" },
  ];

  const utilityPages = [
    { label: "About Us", path: "/AboutUsPage" },
    { label: "Contact Us", path: "/ContactUsPage" },
  ];
  
  // Professional styling classes
  const activeClassName = "text-orange-500 font-semibold border-b-2 border-orange-500";
  const inactiveClassName = "text-gray-700 hover:text-orange-500 font-medium transition-all duration-200 hover:border-b-2 hover:border-orange-300";

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        // Navigate to search results page with query using React Router
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      } catch (error) {
        console.error('Search error:', error);
      }
    }
  };

  return (
<header className="bg-[#131921] shadow-md sticky top-0 z-50 border-b border-gray-200">
      {/* Main Navigation */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo - Enhanced */}
          <Link to="/" className="flex items-center space-x-2 group">
          <div className="flex items-center space-x-2">
            <div className="bg-transparent">
              <img
                src="/IT Images/ITLOGO2.png"
                alt="Logo"
                className="w-30 h-13 rounded"
                onError={(e) => {
                  console.error('Logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
          </Link>

          {/* Search Bar - Amazon Style */}
          <div className="hidden md:flex flex-1 max-w-xl mx-6 relative">
            <form onSubmit={handleSearch} className="flex w-full">
              <div 
                className="bg-gray-700 border border-r-0 border-gray-600 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer hover:bg-gray-600 transition-colors duration-200 relative"
                onMouseEnter={() => setSearchCatOpen(true)}
              >
                <span className="text-gray-200">Main Categories</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="bg-gray-800 text-white flex-1 border border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-r-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <SearchIcon className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>

          {/* Right Side Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Account */}
            <div className="flex flex-col text-sm">
              <span className="text-white">
                {isVendorAuthenticated ? `Hello, ${vendor?.businessName || vendor?.name || 'Vendor'}` :
                 isAuthenticated ? `Hello, ${user?.name || 'User'}` : 'Hello, Sign in'}
              </span>
              <div className="flex items-center space-x-3">
                {isVendorAuthenticated ? (
                  // Vendor authenticated menu
                  <div className="flex items-center space-x-3">
                    <NavLink
                      to="/vendor/dashboard"
                      className="flex items-center text-sm font-medium text-white hover:text-orange-500 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Dashboard
                    </NavLink>
                    <button
                      onClick={vendorLogout}
                      className="flex items-center text-sm font-medium text-white hover:text-orange-500 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                ) : isAuthenticated ? (
                  // Regular user authenticated menu
                  <div className="flex items-center space-x-3">
                    <NavLink
                      to="/profile"
                      className="flex items-center text-sm font-medium text-white hover:text-orange-500 transition-colors duration-200"
                    >
                      <UserIcon className="w-5 h-5 mr-1" />
                      Profile
                    </NavLink>
                    <NavLink
                      to="/orders"
                      className="flex items-center text-sm font-medium text-white hover:text-orange-500 transition-colors duration-200"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Orders
                    </NavLink>
                    <button
                      onClick={logout}
                      className="flex items-center text-sm font-medium text-white hover:text-orange-500 transition-colors duration-200"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  // Guest user menu
                  <>
                    <NavLink
                      to="/login"
                      className={({ isActive }) => `flex items-center text-sm font-medium ${
                        isActive ? 'text-orange-500' : 'text-white hover:text-orange-500'
                      } transition-colors duration-200`}
                    >
                      <UserIcon className="w-5 h-5 mr-1" />
                      Login
                    </NavLink>
                    <NavLink
                      to="/register"
                      className={({ isActive }) => `flex items-center text-sm font-medium ${
                        isActive ? 'text-orange-500' : 'text-white hover:text-orange-500'
                      } transition-colors duration-200`}
                    >
                      Register
                    </NavLink>
                    <NavLink
                      to="/vendor/login"
                      className={({ isActive }) => `flex items-center text-sm font-medium ${
                        isActive ? 'text-orange-500' : 'text-white hover:text-orange-500'
                      } transition-colors duration-200`}
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Sell with Us
                    </NavLink>
                  </>
                )}
              </div>
            </div>

            {/* Cart */}
            <Link to="/cart" className="relative flex items-center space-x-1 text-white hover:text-orange-500 group transition-colors duration-200">
              <div className="relative">
                <ShoppingCartIcon className="w-7 h-7" />
                {cartStats.totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-white">
                    {cartStats.totalItems > 99 ? '99+' : cartStats.totalItems}
                  </span>
                )}
              </div>
              <div className="flex flex-col text-sm">
                <span className="text-xs text-white">Cart</span>
                <span className="font-medium">{cartStats.totalItems} items</span>
              </div>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-md p-1"
              aria-label="Toggle search and menu"
            >
              <SearchIcon className="w-6 h-6" />
            </button>
            <Link to="/cart" className="relative text-white hover:text-orange-500">
              <ShoppingCartIcon className="w-6 h-6" />
              {cartStats.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 shadow-lg border-2 border-white">
                  {cartStats.totalItems > 99 ? '99+' : cartStats.totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-md p-1"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Category Bar - Appears on Search Hover */}
      {searchCatOpen && (
        <div 
          className="bg-gray-800 border-b border-gray-700 shadow-sm"
          onMouseEnter={() => setSearchCatOpen(true)}
          onMouseLeave={() => setSearchCatOpen(false)}
        >
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="hidden md:block">
              <div className="flex flex-wrap gap-1">
                {!loadingCategories && Object.keys(categories).sort().map((main, index) => (
                  <Link
                    key={main}
                    to={`/category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                    onClick={() => {
                      console.log(`Horizontal category bar - Navigating to main category: ${main}`);
                      console.log(`Horizontal category bar - URL: /category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`);
                      setSearchCatOpen(false);
                    }}
                    className="px-3 py-1 text-sm font-medium text-gray-300 hover:text-orange-400 hover:bg-gray-700 rounded transition-colors duration-200"
                  >
                    {main}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="hidden md:flex items-center h-14 justify-between">
            
            {/* Left Section - Categories Dropdown */}
            <div className="flex items-center mr-8">
              <div className="relative" ref={categoriesRef}>
                <button
                  type="button"
                  className="flex items-center space-x-1 px-2 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-200 font-medium text-xs"
                  onClick={() => setCatOpen(!catOpen)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-xs">All Categories</span>
                  <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
                </button>

              {catOpen && (
                <div className="absolute left-0 top-full mt-1 w-80 bg-white shadow-xl rounded-lg border border-gray-200 z-50">
                  <div className="max-h-96 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {loadingCategories ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading categories...</span>
                      </div>
                    ) : Object.keys(categories).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">No categories available</p>
                      </div>
                    ) : (
                      Object.entries(categories)
                        .sort(([a], [b]) => a.localeCompare(b)) // Sort main categories alphabetically
                        .map(([main, subs]) => (
                        <div key={main} className="px-2 py-1 group/main">
                          <div className="flex justify-between items-center px-3 py-2 rounded-md hover:bg-gray-50">
                            <span className="font-semibold text-sm text-gray-800">{main}</span>
                            <Link
                              to={`/category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                              onClick={() => {
                                console.log(`Secondary nav - Navigating to main category: ${main}`);
                                console.log(`Secondary nav - URL: /category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`);
                                setCatOpen(false);
                              }}
                              className="text-xs text-orange-500 hover:text-orange-600 hover:underline opacity-0 group-hover/main:opacity-100 transition-opacity"
                            >
                              View All
                            </Link>
                          </div>
                          {subs.length > 0 && (
                            <ul className="ml-3 mt-1 space-y-1">
                              {subs.sort().map((sub, i) => ( // Sort subcategories alphabetically
                                <li key={i}>
                                  <Link
                                    to={`/category/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                                    onClick={() => {
                                      console.log(`Secondary nav - Navigating to subcategory: ${sub}`);
                                      console.log(`Secondary nav - URL: /category/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`);
                                      setCatOpen(false);
                                    }}
                                    className="block py-1 px-3 text-sm text-gray-600 hover:text-orange-500 hover:bg-gray-50 rounded-md transition-colors duration-150"
                                  >
                                    {sub}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                          <hr className="my-1 border-gray-200" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Left Section - Main Navigation Links */}
            <div className="flex items-center space-x-4 ml-8">
              {mainPages.map((page) => (
                <NavLink
                  key={page.label}
                  to={page.path}
                  className={({ isActive }) => {
                    // Special styling for Wholesale Dealership button
                    if (page.label === 'Wholesale Dealership') {
                      return `px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 whitespace-nowrap border-2 ${
                        isActive 
                          ? 'text-white bg-gradient-to-r from-green-600 to-green-700 border-green-500 shadow-lg transform scale-105' 
                          : 'text-green-400 border-green-500 bg-gradient-to-r from-green-800/20 to-green-700/20 hover:text-white hover:bg-gradient-to-r hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:transform hover:scale-105'
                      }`;
                    }
                    // Default styling for other buttons
                    return `px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                      isActive 
                        ? 'text-orange-400 bg-gray-800 border-b-2 border-orange-400' 
                        : 'text-gray-300 hover:text-orange-400 hover:bg-gray-800'
                    }`;
                  }}
                >
                  {page.label}
                </NavLink>
              ))}
            </div>

            {/* Spacer to push right section to the far right */}
            <div className="flex-1"></div>

            {/* Right Corner - Utility Links */}
            <div className="flex items-center space-x-6">
              {utilityPages.map((page) => (
                <NavLink
                  key={page.label}
                  to={page.path}
                  className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive 
                      ? 'text-orange-400 bg-gray-800' 
                      : 'text-gray-400 hover:text-orange-400 hover:bg-gray-800'
                  }`}
                >
                  {page.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div ref={mobileMenuRef} className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-40 border-t border-gray-200">
          {/* Mobile Search */}
          <div className="px-4 py-3 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-500 px-4 py-2 rounded-r-md"
              >
                <SearchIcon className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>

          <div className="px-4 pt-2 pb-4 space-y-1 max-h-96 overflow-y-auto">
            {[...mainPages, ...utilityPages].map((page) => (
              <NavLink
                key={page.label}
                to={page.path}
                className={({ isActive }) => 
                  `block py-3 px-3 rounded-md text-base font-medium transition-colors duration-150 ${
                    isActive ? 'bg-orange-50 text-orange-600 border-l-4 border-orange-500' : 'text-gray-700 hover:bg-gray-50 hover:text-orange-500'
                  }`
                }
                onClick={() => setIsOpen(false)}
              >
                {page.label}
              </NavLink>
            ))}

            <hr className="my-3 border-gray-200" />
            
            <div className="px-3 py-2">
              <p className="font-semibold text-gray-800 mb-3">Categories</p>
              {/* ADDED: Scrollable container for mobile categories too */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {Object.entries(categories)
                  .sort(([a], [b]) => a.localeCompare(b)) // Sort main categories alphabetically
                  .map(([main, subs]) => (
                  <div key={main} className="mb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-gray-700">{main}</span>
                      <Link
                        to={`/category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                        className="text-xs text-orange-500 hover:underline"
                        onClick={() => setIsOpen(false)}
                      >
                        View All
                      </Link>
                    </div>
                    {subs.length > 0 && (
                      <ul className="ml-2 mt-1 space-y-1">
                        {subs.sort().map((sub, i) => ( // Sort subcategories alphabetically
                          <li key={i}>
                            <Link
                              to={`/category/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                              className="block py-1 text-sm text-gray-600 hover:text-orange-500"
                              onClick={() => setIsOpen(false)}
                            >
                              {sub}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <hr className="my-3 border-gray-200" />
            
            {/* Mobile Authentication Menu */}
            {isVendorAuthenticated ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm text-gray-600">
                  Hello, {vendor?.businessName || vendor?.name || 'Vendor'}
                </div>
                <NavLink
                  to="/vendor/dashboard"
                  className={({ isActive }) => 
                    `flex items-center py-3 px-3 rounded-md text-base font-medium transition-colors duration-150 ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50 hover:text-orange-500'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Vendor Dashboard
                </NavLink>
                <button
                  onClick={() => {
                    vendorLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center py-3 px-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-500 transition-colors duration-150 w-full text-left"
                >
                  Logout
                </button>
              </div>
            ) : isAuthenticated ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm text-gray-600">
                  Hello, {user?.name || 'User'}
                </div>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => 
                    `flex items-center py-3 px-3 rounded-md text-base font-medium transition-colors duration-150 ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50 hover:text-orange-500'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <UserIcon className="w-5 h-5 mr-1" />
                  Profile
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="flex items-center py-3 px-3 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-orange-500 transition-colors duration-150 w-full text-left"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <NavLink
                  to="/login"
                  className={({ isActive }) => 
                    `flex items-center py-3 px-3 rounded-md text-base font-medium transition-colors duration-150 ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50 hover:text-orange-500'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <UserIcon className="w-5 h-5 mr-1" />
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) => 
                    `flex items-center py-3 px-3 rounded-md text-base font-medium transition-colors duration-150 ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-50 hover:text-orange-500'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  Register
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;