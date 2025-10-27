// src/components/Footer.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [footerCategories, setFooterCategories] = useState([]);

  // Load footer categories on component mount
  useEffect(() => {
    loadFooterCategories();
  }, []);

  const loadFooterCategories = async () => {
    try {
      // Use public API endpoint (no authentication required)
      const response = await axios.get(`${getApiUrl()}/footer-categories`);
      setFooterCategories(response.data.data || []);
    } catch (error) {
      // Fall back to default categories if API fails
      console.log('Using default footer categories');
      setFooterCategories([
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Books & Media',
        'Health & Beauty',
        'Automotive',
        'Business & Industrial'
      ]);
    }
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Handle newsletter subscription
  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setMessage('');
    setMessageType('');

    // Validate email
    if (!email.trim()) {
      setMessage('Please enter your email address');
      setMessageType('error');
      return;
    }

    if (!isValidEmail(email.trim())) {
      setMessage('Please enter a valid email address');
      setMessageType('error');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await axios.post(getApiUrl('newsletter/subscribe'), {
        email: email.trim()
      });

      if (response.data.success) {
        setMessage('Successfully subscribed to our newsletter!');
        setMessageType('success');
        setEmail(''); // Clear the input
      } else {
        setMessage(response.data.message || 'Failed to subscribe. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else if (error.response?.status === 400) {
        setMessage('This email is already subscribed or invalid');
      } else {
        setMessage('Failed to subscribe. Please try again later.');
      }
      setMessageType('error');
    } finally {
      setIsSubscribing(false);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 5000);
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 lg:px-12 max-w-7xl py-12">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-3">
              Stay Updated with International Tijarat
            </h3>
            <p className="text-gray-300 mb-6">
              Get the latest deals, new arrivals, and exclusive offers delivered to your inbox.
            </p>
            
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={isSubscribing}
                  className="flex-1 px-4 py-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  type="submit"
                  disabled={isSubscribing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center min-w-[120px]"
                >
                  {isSubscribing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>
              
              {/* Message Display */}
              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  messageType === 'success' 
                    ? 'bg-green-800 text-green-200 border border-green-700' 
                    : 'bg-red-800 text-red-200 border border-red-700'
                }`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-6 lg:px-12 max-w-7xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="lg:col-span-1">
          <div className="flex items-center space-x-2">
            <div className="bg-transparent">
              <img
                src="/IT Images/ITLOGO2.png"
                alt="Logo"
                className="w-30 h-13"
                onError={(e) => {
                  console.error('Footer logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
              Your trusted global marketplace connecting millions of buyers and sellers worldwide with premium products and exceptional service.
            </p>
            
            {/* Social Media */}
            <div className="flex space-x-3">
              {[
                { 
                  name: "Facebook", 
                  url: "https://www.facebook.com/internationaltijarat",
                  icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" 
                },
                { 
                  name: "X", 
                  url: "https://x.com/Intern_Tijarat",
                  icon: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" 
                },
                { 
                  name: "Instagram", 
                  url: "https://www.instagram.com/intern_it/profilecard/?igsh=MW1kNHN5ZmU1ejNsOA==",
                  icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" 
                },
                { 
                  name: "LinkedIn", 
                  url: "https://www.linkedin.com/company/international-tijarat/",
                  icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" 
                }
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors duration-200"
                  title={social.name}
                  aria-label={`Visit our ${social.name} page`}
                >
                  <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h5 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Shop</h5>
            <ul className="space-y-2">
              {footerCategories.map((category, index) => (
                <li key={index}>
                  <Link 
                    to={`/category-group/${encodeURIComponent(category.toLowerCase())}`}
                    className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h5 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Customer Care</h5>
            <ul className="space-y-2">
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Size Guide
                </Link>
              </li>
              <li>
                <Link to="/simple-order-history" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Payment Options
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Product Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Company</h5>
            <ul className="space-y-2 mb-6">
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Press Center
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Investor Relations
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Corporate Social Responsibility
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Affiliate Program
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Partnerships
                </Link>
              </li>
              <li>
                <Link to="/coming-soon" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                  Sustainability
                </Link>
              </li>
            </ul>

            {/* Contact Info */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h6 className="font-medium text-white mb-2 text-sm">Contact Information</h6>
              <div className="space-y-1 text-xs text-gray-300">
                <p>📧 support@internationaltijarat.com</p>
                <p>📞 +92 300 5567507</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods & Security */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-6 lg:px-12 max-w-7xl py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Payment Methods */}
            <div>
              <h6 className="text-sm font-medium text-white mb-3">Payment Methods</h6>
              <div className="flex flex-wrap gap-3">
                {/* EasyPaisa */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[120px]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#00A651"/>
                    <path d="M7 8h10v2H7V8zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" fill="white"/>
                  </svg>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">EasyPaisa</span>
                    <span className="text-xs text-gray-600">Mobile Wallet</span>
                  </div>
                </div>

                {/* JazzCash */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[120px]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#FF6B35"/>
                    <path d="M12 6l4 6h-3v6h-2v-6H8l4-6z" fill="white"/>
                  </svg>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">JazzCash</span>
                    <span className="text-xs text-gray-600">Mobile Wallet</span>
                  </div>
                </div>

                {/* Bank Transfer */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[120px]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#1F4E79"/>
                    <path d="M12 3l8 5v2H4V8l8-5zm0 2L6 8h12L12 5zm-6 7h12v8H6v-8zm2 2v4h8v-4H8z" fill="white"/>
                  </svg>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 block">Bank Transfer</span>
                    <span className="text-xs text-gray-600">Direct Banking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Certifications */}
            <div className="text-center lg:text-right">
              <h6 className="text-sm font-medium text-white mb-3">Security & Trust</h6>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
                {[
                  "SSL Secured", "PCI Compliant", "ISO 27001", "BBB Accredited"
                ].map((cert, index) => (
                  <div
                    key={index}
                    className="bg-gray-700 border border-gray-600 px-3 py-1 rounded text-xs font-medium text-gray-300"
                  >
                    {cert}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-gray-900 border-t border-gray-700">
        <div className="container mx-auto px-6 lg:px-12 max-w-7xl py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <div className="flex flex-wrap items-center gap-4">
              <p>© 2025 International Tijarat. All rights reserved.</p>
              <div className="flex gap-4">
                <Link to="/privacy" className="hover:text-white transition-colors duration-200">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white transition-colors duration-200">Terms of Service</Link>
                <a href="#" className="hover:text-white transition-colors duration-200">Cookies</a>
              </div>
            </div>
            <p className="text-gray-500">Powered by cutting-edge e-commerce technology</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;