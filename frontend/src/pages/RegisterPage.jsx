import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthForm from "../components/AuthForm";
import OTPVerification from "../components/Auth/OTPVerification";
import emailVerificationService from "../services/emailVerificationService";

const RegisterPage = () => {
  const [notification, setNotification] = useState(null);
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'verification', 'complete'
  const [formData, setFormData] = useState({});
  const [verificationEmail, setVerificationEmail] = useState('');
  const navigate = useNavigate();
  const { register, loading, error, isAuthenticated } = useAuth();

  // Debug logging for step changes
  useEffect(() => {
    console.log('🔍 RegisterPage: currentStep changed to:', currentStep);
  }, [currentStep]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // SEO: Dynamic document title and meta
  useEffect(() => {
    document.title = "Create Account - International Tijarat | Join Our Community";
    
    // Add meta description if not exists
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Join International Tijarat today. Create your account to access premium products, exclusive deals, and seamless shopping experience.';
      document.head.appendChild(meta);
    }
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleRegister = useCallback(async (data) => {
    try {
      console.log('🔍 RegisterPage: Starting registration process', { email: data.email, name: data.name });
      
      // Store form data for later use
      setFormData(data);
      setVerificationEmail(data.email);
      
      console.log('🔍 RegisterPage: Sending OTP request...');
      
      // Send OTP to email
      const otpResult = await emailVerificationService.sendCustomerOTP(data.email, data.name);
      
      console.log('🔍 RegisterPage: OTP result received', otpResult);
      
      if (otpResult.success) {
        console.log('🔍 RegisterPage: Switching to verification step');
        setCurrentStep('verification');
        showNotification("Verification code sent to your email!", "success");
      } else {
        console.log('🔍 RegisterPage: OTP failed', otpResult);
        showNotification(otpResult.message || "Failed to send verification code", "error");
      }
    } catch (err) {
      console.error('🔍 RegisterPage: Error in handleRegister', err);
      showNotification(err.message || "Failed to send verification code", "error");
    }
  }, [showNotification]);

  // Handle successful email verification
  const handleVerificationSuccess = useCallback(async () => {
    try {
      // Now actually register the user
      const result = await register(formData);
      
      if (result.success) {
        setCurrentStep('complete');
        showNotification("Welcome aboard! Registration successful!", "success");
        setTimeout(() => navigate("/"), 3000);
      } else {
        showNotification(result.error || "Registration failed", "error");
        setCurrentStep('form'); // Go back to form
      }
    } catch (err) {
      showNotification("Registration failed. Please try again.", "error");
      setCurrentStep('form');
    }
  }, [register, formData, navigate, showNotification]);

  // Handle going back to form
  const handleBackToForm = useCallback(() => {
    setCurrentStep('form');
    setFormData(null);
    setVerificationEmail('');
  }, []);

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

  // Multi-step rendering based on current step
  if (currentStep === 'verification') {
    return (
      <>
        {/* SEO: Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Email Verification - International Tijarat",
            "description": "Verify your email address to complete registration",
            "url": window.location.href,
            "mainEntity": {
              "@type": "Organization",
              "name": "International Tijarat",
              "url": "/"
            }
          })}
        </script>

        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Back Arrow */}
          <div className="absolute top-6 left-6 z-10">
            <button
              onClick={() => setCurrentStep('form')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>
          </div>

          {/* Background Decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-md relative">
            <OTPVerification
              email={verificationEmail || formData.email}
              onVerificationSuccess={handleVerificationSuccess}
              onBack={() => setCurrentStep('form')}
            />
          </div>

          {/* Notification */}
          {notification && <Notification {...notification} />}
        </div>
      </>
    );
  }

  if (currentStep === 'complete') {
    return (
      <>
        {/* SEO: Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Registration Complete - International Tijarat",
            "description": "Welcome to International Tijarat premium shopping community",
            "url": window.location.href,
            "mainEntity": {
              "@type": "Organization",
              "name": "International Tijarat",
              "url": "/"
            }
          })}
        </script>

        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-orange-400/10 to-orange-600/10 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-md relative text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg mb-8 transform animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Success Message */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200/50 p-8 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to International Tijarat!</h1>
              <p className="text-gray-600 mb-6">
                Your account has been successfully created and verified. You can now start exploring our premium products and exclusive deals.
              </p>
              
              <div className="space-y-4">
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign In to Your Account
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Explore Products
                </Link>
              </div>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: "🛍️", text: "Premium Products" },
                { icon: "🚚", text: "Fast Delivery" },
                { icon: "💎", text: "Exclusive Deals" }
              ].map((item, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-orange-200/30">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs font-semibold text-gray-700">{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification */}
          {notification && <Notification {...notification} />}
        </div>
      </>
    );
  }

  // Default form step
  return (
    <>
      {/* SEO: Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Register - International Tijarat",
          "description": "Create your account to join our premium shopping community",
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
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-orange-600">Account Details</span>
              </div>
              <div className="w-8 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Email Verification</span>
              </div>
            </div>
          </div>

          {/* Header Section */}
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg mb-4 transform hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              Join Our Community
              <span className="block text-lg font-normal text-gray-600 mt-2">
                Start your premium shopping journey
              </span>
            </h1>
            
            <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
              Create your account to access exclusive deals, premium products, and personalized shopping experience.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200/50 p-8 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-orange-50/30 pointer-events-none" />
            
            <div className="relative z-10">
              <AuthForm 
                type="register" 
                onSubmit={handleRegister}
              />
              
              {/* Additional Links */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link 
                    to="/login" 
                    className="font-semibold text-orange-600 hover:text-orange-700 transition-colors duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
                
                <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
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
              { text: "Secure" },
              { text: "Fast Setup" },
              { text: "Exclusive Deals" }
            ].map((item, index) => (
              <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-orange-200/30">
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
              <span className="font-semibold text-gray-700">Sending verification code...</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
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
      `}</style>
    </>
  );
};

export default RegisterPage;