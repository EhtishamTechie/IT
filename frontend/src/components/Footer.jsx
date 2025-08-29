// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
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
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
                Subscribe
              </button>
            </div>
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
                src="./IT Images/ITLOGO2.png"
                alt="Logo"
                className="w-30 h-13"
              />
            </div>
          </div>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">
              Your trusted global marketplace connecting millions of buyers and sellers worldwide with premium products and exceptional service.
            </p>
            
            {/* Social Media */}
            <div className="flex space-x-3">
              {[
                { name: "Facebook", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                { name: "Twitter", icon: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
                { name: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" },
                { name: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" }
              ].map((social, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors duration-200"
                  title={social.name}
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
              {[
                "Electronics",
                "Fashion",
                "Home & Garden",
                "Sports & Outdoors",
                "Books & Media",
                "Health & Beauty",
                "Automotive",
                "Business & Industrial"
              ].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h5 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Customer Care</h5>
            <ul className="space-y-2">
              {[
                "Help Center",
                "Contact Us",
                "Shipping Info",
                "Returns & Exchanges",
                "Size Guide",
                "Track Your Order",
                "Payment Options",
                "Product Care"
              ].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h5 className="text-sm font-semibold text-white uppercase tracking-wide mb-4">Company</h5>
            <ul className="space-y-2 mb-6">
              {[
                "About Us",
                "Careers",
                "Press Center",
                "Investor Relations",
                "Corporate Social Responsibility",
                "Affiliate Program",
                "Partnerships",
                "Sustainability"
              ].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-300 hover:text-white text-sm transition-colors duration-200">
                    {item}
                  </a>
                </li>
              ))}
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
              <h6 className="text-sm font-medium text-white mb-3">We Accept</h6>
              <div className="flex flex-wrap gap-2">
                {/* Visa */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[80px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="white"/>
                    <path d="M8.5 17.5L10.8 6.5H13.2L10.9 17.5H8.5Z" fill="#1A1F71"/>
                    <path d="M19.2 6.8C18.7 6.6 18.1 6.5 17.4 6.5C15.6 6.5 14.3 7.4 14.3 8.7C14.3 9.7 15.2 10.2 15.9 10.5C16.6 10.8 16.9 11 16.9 11.3C16.9 11.7 16.4 11.9 15.9 11.9C15.2 11.9 14.8 11.8 14.2 11.5L13.9 11.4L13.6 13.2C14.2 13.5 15.3 13.7 16.4 13.7C18.4 13.7 19.6 12.8 19.6 11.4C19.6 10.7 19.1 10.1 18.1 9.7C17.5 9.4 17.1 9.2 17.1 8.9C17.1 8.6 17.5 8.3 18.2 8.3C18.8 8.3 19.3 8.4 19.7 8.6L19.9 8.7L20.2 6.9L19.2 6.8Z" fill="#1A1F71"/>
                    <path d="M23.8 6.5H22.1C21.6 6.5 21.2 6.7 21 7.1L17.8 17.5H19.8L20.3 16.1H22.8L23 17.5H24.8L23.8 6.5ZM21 14.4L22.2 11.2L22.6 14.4H21Z" fill="#1A1F71"/>
                    <path d="M31.5 6.5H29.1L26.8 17.5H28.8L29.3 15.8H31.8L32 17.5H34.8L31.5 6.5ZM30 14.1L31.2 10.9L31.6 14.1H30Z" fill="#1A1F71"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Visa</span>
                </div>

                {/* Mastercard */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[100px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="white"/>
                    <circle cx="15" cy="12" r="7" fill="#EB001B"/>
                    <circle cx="25" cy="12" r="7" fill="#F79E1B"/>
                    <path d="M20 6.5C21.9 8 23 10.3 23 12.5C23 14.7 21.9 17 20 18.5C18.1 17 17 14.7 17 12.5C17 10.3 18.1 8 20 6.5Z" fill="#FF5F00"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Mastercard</span>
                </div>

                {/* American Express */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[100px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="#006FCF"/>
                    <path d="M8 8H12L13 10.5L14 8H18L16 12L18 16H14L13 13.5L12 16H8L10 12L8 8Z" fill="white"/>
                    <path d="M22 8H26V9H22V10H25V11H22V12H26V13H22V14H25V15H22V16H26V16H22L22 8Z" fill="white"/>
                    <path d="M28 8H32L33 10L34 8H36L34 12L36 16H34L33 14L32 16H28L30 12L28 8Z" fill="white"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Amex</span>
                </div>

                {/* PayPal */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[80px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="white"/>
                    <path d="M12 7C13.5 7 14.8 7.3 15.7 8.1C16.6 8.9 17 10.1 16.8 11.5C16.4 14.5 14.8 16 12.3 16H10.5L9.8 20H7.5L9.5 9H12V7Z" fill="#0070BA"/>
                    <path d="M15 10C16.2 10 17.2 10.2 17.9 10.8C18.6 11.4 18.8 12.3 18.7 13.4C18.4 15.8 17.2 17 15.2 17H13.8L13.2 20H11.2L12.8 12H15V10Z" fill="#001C64"/>
                    <path d="M18.5 13C19.5 13 20.3 13.2 20.8 13.6C21.3 14 21.4 14.6 21.3 15.3C21.1 16.9 20.3 17.5 19 17.5H18L17.6 20H16L17.2 14.5H18.5V13Z" fill="#0070BA"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">PayPal</span>
                </div>

                {/* Apple Pay */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[100px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="black"/>
                    <path d="M12.5 8.5C12.8 8.1 13.1 7.6 13 7C12.5 7 11.9 7.3 11.6 7.7C11.3 8.1 11.1 8.6 11.2 9.1C11.7 9.1 12.2 8.9 12.5 8.5Z" fill="white"/>
                    <path d="M13 9.2C12.2 9.2 11.6 9.6 11.2 9.6C10.8 9.6 10.3 9.3 9.7 9.3C8.9 9.3 8.1 9.8 7.7 10.5C6.8 11.9 7.5 14 8.4 15.2C8.8 15.8 9.3 16.5 10 16.5C10.6 16.5 10.8 16.1 11.5 16.1C12.2 16.1 12.4 16.5 13.1 16.5C13.8 16.5 14.2 15.9 14.6 15.3C15.1 14.6 15.3 13.9 15.3 13.9C15.3 13.9 14.3 13.5 14.3 12.4C14.3 11.5 15 11 15 11C15 11 14.4 9.2 13 9.2Z" fill="white"/>
                    <path d="M20 9H22.5V16H20.8V10.4H20L18.8 16H17.5L16.3 10.4H16.2V16H14.5V9H17L18.1 14.2H18.2L19.3 9H20Z" fill="white"/>
                    <path d="M27 12.8C27 14.5 25.8 15.5 24.2 15.5C22.6 15.5 21.4 14.5 21.4 12.8C21.4 11.1 22.6 10.1 24.2 10.1C25.8 10.1 27 11.1 27 12.8ZM25.3 12.8C25.3 11.9 24.8 11.4 24.2 11.4C23.6 11.4 23.1 11.9 23.1 12.8C23.1 13.7 23.6 14.2 24.2 14.2C24.8 14.2 25.3 13.7 25.3 12.8Z" fill="white"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Apple Pay</span>
                </div>

                {/* Google Pay */}
                <div className="bg-white border border-gray-600 px-3 py-2 rounded flex items-center gap-2 min-w-[100px]">
                  <svg className="w-8 h-5" viewBox="0 0 40 24" fill="none">
                    <rect width="40" height="24" rx="4" fill="white"/>
                    <path d="M16.8 12C16.8 10.3 18.2 9 19.9 9C21.6 9 23 10.3 23 12C23 13.7 21.6 15 19.9 15C18.2 15 16.8 13.7 16.8 12ZM21.7 12C21.7 11 21 10.3 19.9 10.3C18.8 10.3 18.1 11 18.1 12C18.1 13 18.8 13.7 19.9 13.7C21 13.7 21.7 13 21.7 12Z" fill="#4285F4"/>
                    <path d="M13.2 9.1V14.9H11.9V9.1H13.2Z" fill="#34A853"/>
                    <path d="M8.5 11.4C8.5 10.6 9 10.2 9.7 10.2C10.3 10.2 10.7 10.5 10.8 11H12.1C12 9.8 11.1 9 9.7 9C8.2 9 7.2 9.9 7.2 11.4V12.6C7.2 14.1 8.2 15 9.7 15C11.1 15 12 14.2 12.1 13H10.8C10.7 13.5 10.3 13.8 9.7 13.8C9 13.8 8.5 13.4 8.5 12.6V11.4Z" fill="#FBBC04"/>
                    <path d="M25.4 9.1V14.9H24.1V9.1H25.4Z" fill="#EA4335"/>
                    <path d="M30.1 10.2C30.8 10.2 31.2 10.6 31.2 11.4V12.6C31.2 13.4 30.8 13.8 30.1 13.8C29.5 13.8 29.1 13.5 29 13H27.7C27.8 14.2 28.7 15 30.1 15C31.6 15 32.6 14.1 32.6 12.6V11.4C32.6 9.9 31.6 9 30.1 9C28.7 9 27.8 9.8 27.7 11H29C29.1 10.5 29.5 10.2 30.1 10.2Z" fill="#34A853"/>
                  </svg>
                  <span className="text-xs font-medium text-gray-700">Google Pay</span>
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
                <a href="#" className="hover:text-white transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors duration-200">Terms of Service</a>
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