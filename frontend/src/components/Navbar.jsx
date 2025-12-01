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
  const [showHorizontalCategories, setShowHorizontalCategories] = useState(false); // For horizontal category bar
  const [hoveredCategory, setHoveredCategory] = useState(null); // Track which category is hovered
  const [submenuPosition, setSubmenuPosition] = useState(0); // Track submenu Y position
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const categoriesRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const hoverTimeoutRef = useRef(null); // Add timeout ref for delayed closing
  const mainCategoriesTimeoutRef = useRef(null); // Timeout for main categories hover
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
  ];

  const otherPages = [
    { label: "Blog", path: "/BlogPage" },
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
          <div 
            className="hidden md:flex flex-1 max-w-xl mx-6 relative"
            onMouseEnter={() => {
              if (mainCategoriesTimeoutRef.current) {
                clearTimeout(mainCategoriesTimeoutRef.current);
                mainCategoriesTimeoutRef.current = null;
              }
              setShowHorizontalCategories(true);
            }}
            onMouseLeave={() => {
              mainCategoriesTimeoutRef.current = setTimeout(() => {
                setShowHorizontalCategories(false);
              }, 200);
            }}
          >
            <form onSubmit={handleSearch} className="flex w-full">
              <div 
                className="bg-gray-700 border border-r-0 border-gray-600 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent hover:bg-gray-600 transition-colors duration-200 relative cursor-pointer"
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
            {/* Account Dropdown */}
            {isVendorAuthenticated || isAuthenticated ? (
              // Show greeting text for authenticated users
              <div className="flex items-center space-x-3">
                <span className="text-white text-sm font-medium">
                  {isVendorAuthenticated 
                    ? `Hello, ${vendor?.businessName || vendor?.name || 'Vendor'}` 
                    : `Hello, ${user?.name || 'User'}`}
                </span>
                <div className="relative group">
                  <button className="flex items-center space-x-1 text-white hover:text-orange-500 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-700">
                    <UserIcon className="w-5 h-5" />
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      {isVendorAuthenticated ? (
                        <>
                          <NavLink
                            to="/vendor/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Vendor Dashboard
                          </NavLink>
                          <hr className="my-1 border-gray-200" />
                          <button
                            onClick={vendorLogout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <NavLink
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                          >
                            <UserIcon className="w-4 h-4 mr-2" />
                            My Profile
                          </NavLink>
                          <NavLink
                            to="/orders"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            My Orders
                          </NavLink>
                          <hr className="my-1 border-gray-200" />
                          <button
                            onClick={logout}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Show single dropdown button for guest users
              <div className="relative group">
                <button className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg">
                  <UserIcon className="w-5 h-5" />
                  <span>Account</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {/* Dropdown Menu for Guest */}
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <NavLink
                      to="/login"
                      className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Login
                    </NavLink>
                    <NavLink
                      to="/register"
                      className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Register
                    </NavLink>
                    <hr className="my-1 border-gray-200" />
                    <NavLink
                      to="/vendor/login"
                      className="flex items-center px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors duration-150"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Sell with Us
                    </NavLink>
                    <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 mt-1">
                      Become a vendor and start selling
                    </div>
                  </div>
                </div>
              </div>
            )}

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

      {/* Horizontal Category Bar - Show on Hover */}
      {showHorizontalCategories && (
        <div 
          className="bg-gray-800 border-b border-gray-700 shadow-sm"
          onMouseEnter={() => {
            if (mainCategoriesTimeoutRef.current) {
              clearTimeout(mainCategoriesTimeoutRef.current);
              mainCategoriesTimeoutRef.current = null;
            }
            setShowHorizontalCategories(true);
          }}
          onMouseLeave={() => {
            mainCategoriesTimeoutRef.current = setTimeout(() => {
              setShowHorizontalCategories(false);
            }, 200);
          }}
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
                      setShowHorizontalCategories(false);
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
              <div 
                className="relative" 
                ref={categoriesRef}
                onMouseEnter={() => setCatOpen(true)}
                onMouseLeave={() => setCatOpen(false)}
              >
                <button
                  type="button"
                  className="flex items-center space-x-1 px-2 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors duration-200 font-medium text-xs"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-xs">All Categories</span>
                  <ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
                </button>

              {catOpen && (
                <div 
                  className="absolute left-0 w-64 z-50" 
                  style={{ top: 'calc(100% - 1px)' }}
                  onMouseEnter={() => setCatOpen(true)}
                  onMouseLeave={() => setCatOpen(false)}
                >
                  <div className="bg-white shadow-xl rounded-lg border border-gray-200">
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
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([main, subs]) => (
                        <div 
                          key={main} 
                          className="relative"
                          onMouseEnter={(e) => {
                            // Clear any pending timeout
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }
                            setHoveredCategory(main);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const parentRect = e.currentTarget.closest('.overflow-y-auto').getBoundingClientRect();
                            setSubmenuPosition(rect.top - parentRect.top);
                          }}
                          onMouseLeave={(e) => {
                            // Delay closing to allow moving to submenu
                            hoverTimeoutRef.current = setTimeout(() => {
                              setHoveredCategory(null);
                            }, 150);
                          }}
                        >
                          <Link
                            to={`/category-group/${main.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                            onClick={() => {
                              console.log(`Secondary nav - Navigating to main category: ${main}`);
                              setCatOpen(false);
                              setHoveredCategory(null);
                            }}
                            className="flex justify-between items-center px-4 py-2.5 text-sm text-gray-800 hover:bg-orange-50 hover:text-orange-600 transition-colors duration-150 font-medium"
                          >
                            <span>{main}</span>
                            {subs.length > 0 && (
                              <svg className={`w-4 h-4 transition-colors ${hoveredCategory === main ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Subcategories panel - appears to the right aligned with hovered category */}
                  {hoveredCategory && categories[hoveredCategory]?.length > 0 && (
                    <>
                      {/* Invisible bridge to prevent gap */}
                      <div 
                        className="submenu-bridge absolute w-2 h-full z-40"
                        style={{ 
                          left: '100%',
                          top: 0,
                          pointerEvents: 'auto'
                        }}
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                        }}
                      />
                      <div 
                        className="submenu-panel absolute w-64 z-50"
                        style={{ 
                          left: 'calc(100% + 2px)',
                          top: `${submenuPosition}px`
                        }}
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          setHoveredCategory(hoveredCategory);
                        }}
                        onMouseLeave={() => {
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredCategory(null);
                          }, 150);
                        }}
                      >
                        <div className="bg-white shadow-xl rounded-lg border border-gray-200">
                      <div className="max-h-96 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        <div className="px-4 py-2 border-b border-gray-200 bg-orange-50">
                          <p className="text-sm font-semibold text-orange-600">{hoveredCategory}</p>
                        </div>
                        {categories[hoveredCategory].sort().map((sub, i) => (
                          <Link
                            key={i}
                            to={`/category-group/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                            onClick={() => {
                              console.log(`Secondary nav - Navigating to subcategory: ${sub}`);
                              setCatOpen(false);
                              setHoveredCategory(null);
                            }}
                            className="block py-2.5 px-4 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-150"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                      </div>
                      </div>
                    </>
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

            {/* Right Corner - Other Dropdown */}
            <div className="flex items-center -mr-2">
              <div className="relative group">
                <button className="flex items-center space-x-1 px-2 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-orange-400 hover:bg-gray-800 transition-all duration-200">
                  <span>Other</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {otherPages.map((page) => (
                      <NavLink
                        key={page.label}
                        to={page.path}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-orange-400 transition-colors duration-150"
                      >
                        {page.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
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
            {[...mainPages, ...otherPages].map((page) => (
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
                              to={`/category-group/${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
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