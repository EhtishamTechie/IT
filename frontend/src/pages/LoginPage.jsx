import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/AuthForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const { login, loading, error, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // SEO: Dynamic document title and meta
  useEffect(() => {
    document.title = "Sign In - International Tijarat | Access Your Account";
    
    // Add meta description if not exists
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Sign in to your International Tijarat account. Access your orders, wishlist, exclusive deals and premium shopping experience.';
      document.head.appendChild(meta);
    }
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleLogin = useCallback(async (credentials) => {
    try {
      const result = await login(credentials.email, credentials.password);
      
      if (result.success) {
        showNotification("Welcome back! Login successful!", "success");
        
        // Small delay for UX before navigation
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else {
        showNotification(result.error || "Login failed", "error");
      }
    } catch (err) {
      showNotification("An unexpected error occurred", "error");
    }
  }, [login, navigate, showNotification]);

  const Notification = ({ message, type }) => (
    <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-500 ${
      type === 'success' 
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    } animate-slide-in-right`}>
      <div className="flex items-center space-x-3">
        {type === 'success' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="font-semibold">{message}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* SEO: Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Login - International Tijarat",
          "description": "Sign in to access your account and continue your premium shopping experience",
          "url": window.location.href,
          "mainEntity": {
            "@type": "Organization",
            "name": "International Tijarat",
            "url": "/"
          }
        })}
      </script>

      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Back Arrow - Top Left Corner */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            to="/"
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
        </div>

        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Header Section */}
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg mb-4 transform hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Welcome Back
              <span className="block text-lg font-normal text-gray-600 mt-2">
                Sign in to your account
              </span>
            </h1>
            
            <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
              Access your orders, wishlist, exclusive deals, and continue your premium shopping experience.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200/50 p-8 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-orange-50/30 pointer-events-none" />
            
            <div className="relative z-10">
              <AuthForm
                type="login"
                onSubmit={handleLogin}
                loading={loading}
                apiError={error}
              />
              
              {/* Additional Links */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link 
                    to="/register"
                    className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-200 underline-offset-2 hover:underline"
                  >
                    Create one here
                  </Link>
                </p>
                
                <button 
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  Forgot your password?
                </button>
                
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mt-4">
                  <a href="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</a>
                  <span>•</span>
                  <a href="/terms" className="hover:text-gray-700 transition-colors">Terms of Service</a>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { text: "Secure Login" },
              { text: "Instant Access" },
              { text: "Professional" }
            ].map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-orange-200/30 hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-xs font-semibold text-gray-700">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification */}
        {notification && <Notification {...notification} />}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <span className="font-semibold text-gray-700">Signing you in...</span>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes slide-in-right {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in-right {
            animation: slide-in-right 0.5s ease-out;
          }
        `}
      </style>
    </>
  );
};

export default LoginPage;