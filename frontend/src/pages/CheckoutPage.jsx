import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { getImageUrl } from "../config";
import OrderService from "../services/orderService";
import ProductService from "../services/productService";
import { analyzeCart, shouldShowDeliveryNotification, generateDeliveryEstimate, getOrderTypeDisplayName } from "../utils/cartAnalysis";

// Phone number validation function
const isValidPhoneNumber = (phone) => {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Check for various valid formats:
  // 1. Pakistani numbers starting with +92: +92xxxxxxxxxx (13 digits total)
  // 2. Pakistani numbers starting with 0: 0xxxxxxxxxx (11 digits)
  // 3. International numbers: +countrycode + number (7-15 digits after +)
  // 4. Local numbers: xxxxxxxxxx (10-15 digits)
  
  // Pakistani format: +92xxxxxxxxxx
  if (cleanPhone.match(/^\+92\d{10}$/)) {
    return true;
  }
  
  // Pakistani format starting with 0: 0xxxxxxxxxx (11 digits)
  if (cleanPhone.match(/^0\d{10}$/)) {
    return true;
  }
  
  // International format: +countrycode + 7-15 digits
  if (cleanPhone.match(/^\+\d{7,15}$/)) {
    return true;
  }
  
  // Local format: 10-15 digits (can start with any digit)
  if (cleanPhone.match(/^\d{10,15}$/)) {
    return true;
  }
  
  return false;
};

// Step Indicator Component
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Customer Info" },
    { number: 2, title: "Address" },
    { number: 3, title: "Payment" },
    { number: 4, title: "Review" }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= step.number 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.number}
            </div>
            <span className={`ml-2 text-sm ${
              currentStep >= step.number ? 'text-orange-600 font-medium' : 'text-gray-500'
            }`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-12 h-px mx-4 ${
                currentStep > step.number ? 'bg-orange-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Payment Method Component
const PaymentMethod = ({ id, title, description, selected, onClick }) => (
  <div
    onClick={onClick}
    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
      selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className="flex items-center">
      <input
        type="radio"
        checked={selected}
        onChange={() => {}}
        className="mr-3 text-orange-500"
      />
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  </div>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, cartStats, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errors, setErrors] = useState({});
  const [orderCompleted, setOrderCompleted] = useState(false); // Add flag for completed order

  // Redirect if cart is empty (but not if order was just completed)
  useEffect(() => {
    if (cartStats && cartStats.isEmpty && !orderCompleted && !isSubmitting) {
      navigate('/cart');
    }
  }, [cartStats, navigate, orderCompleted, isSubmitting]);

  // Ensure only cash payment method is available
  useEffect(() => {
    setForm(prev => ({ ...prev, paymentMethod: 'cash' }));
  }, []);

  // Note: Removed authentication requirement to allow guest checkout

  // Form state
  const [form, setForm] = useState({
    // Customer Information - Pre-fill from user profile
    name: user?.name || user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || user?.phoneNumber || '',
    
    // Shipping Information - Default to user's saved address or country
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'Pakistan', // Default country
    // Removed shippingMethod as no shipping options available
    
    // Payment Information
    paymentMethod: 'cash',
    
    // Credit Card Information
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    
    // Bank Transfer Information
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    routingNumber: '',
    
    // Mobile Wallet Information (JazzCash/EasyPaisa)
    walletNumber: '',
    walletPin: ''
  });

  // Calculate order totals and analyze cart
  const orderTotals = useMemo(() => {
    const subtotal = cartStats?.totalPrice || 0;
    // No shipping cost - always N/A
    const shippingCost = 0;
    // No tax - removed as requested
    const tax = 0;
    const total = subtotal; // Only product charges

    return {
      subtotal,
      shipping: shippingCost,
      tax,
      total
    };
  }, [cartStats?.totalPrice]);

  // Analyze cart for order type and mixed delivery notification
  const cartAnalysis = useMemo(() => {
    const analysis = analyzeCart(cartStats?.items || []);
    console.log('🔍 Cart Analysis Debug:', {
      cartItems: cartStats?.items,
      analysis: analysis,
      hasNotification: !!analysis.notification
    });
    return analysis;
  }, [cartStats?.items]);

  // Payment validation functions
  const validateCreditCard = (cardNumber) => {
    // Remove spaces and non-digits
    const cleaned = cardNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    // Check if it's empty or not numeric
    if (!cleaned || !/^\d+$/.test(cleaned)) return false;
    
    // Luhn algorithm for credit card validation
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19;
  };

  const getCardType = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s+/g, '');
    
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'MasterCard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    if (/^6/.test(cleaned)) return 'Discover';
    
    return 'Unknown';
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Bank account validation functions
  const validateBankAccount = (accountNumber, routingNumber, bankName) => {
    const errors = {};
    
    // Clean account number (remove spaces and non-digits)
    const cleanedAccount = accountNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const cleanedRouting = routingNumber.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    // Account number validation
    if (!cleanedAccount) {
      errors.accountNumber = 'Account number is required';
    } else if (cleanedAccount.length < 8) {
      errors.accountNumber = 'Account number must be at least 8 digits';
    } else if (cleanedAccount.length > 17) {
      errors.accountNumber = 'Account number cannot exceed 17 digits';
    } else if (!/^\d+$/.test(cleanedAccount)) {
      errors.accountNumber = 'Account number must contain only digits';
    } else {
      // Check for invalid patterns
      if (/^0+$/.test(cleanedAccount)) {
        errors.accountNumber = 'Invalid account number (all zeros)';
      } else if (/^1+$/.test(cleanedAccount) || /^9+$/.test(cleanedAccount)) {
        errors.accountNumber = 'Invalid account number pattern';
      }
      
      // Simulate bank-specific validation
      if (bankName.toLowerCase().includes('chase') && !cleanedAccount.startsWith('12')) {
        // Mock Chase bank account validation
        if (cleanedAccount.length !== 12) {
          errors.accountNumber = 'Chase accounts must be 12 digits';
        }
      } else if (bankName.toLowerCase().includes('wells fargo') && cleanedAccount.length < 10) {
        errors.accountNumber = 'Wells Fargo accounts must be at least 10 digits';
      } else if (bankName.toLowerCase().includes('bank of america')) {
        if (cleanedAccount.length < 12 || cleanedAccount.length > 16) {
          errors.accountNumber = 'Bank of America accounts must be 12-16 digits';
        }
      }
    }
    
    // Routing number validation (US format)
    if (!cleanedRouting) {
      errors.routingNumber = 'Routing number is required';
    } else if (cleanedRouting.length !== 9) {
      errors.routingNumber = 'Routing number must be exactly 9 digits';
    } else if (!/^\d+$/.test(cleanedRouting)) {
      errors.routingNumber = 'Routing number must contain only digits';
    } else {
      // ABA routing number checksum validation
      const checksum = 
        3 * (parseInt(cleanedRouting[0]) + parseInt(cleanedRouting[3]) + parseInt(cleanedRouting[6])) +
        7 * (parseInt(cleanedRouting[1]) + parseInt(cleanedRouting[4]) + parseInt(cleanedRouting[7])) +
        1 * (parseInt(cleanedRouting[2]) + parseInt(cleanedRouting[5]) + parseInt(cleanedRouting[8]));
      
      if (checksum % 10 !== 0) {
        errors.routingNumber = 'Invalid routing number (checksum failed)';
      }
      
      // Check for common invalid routing numbers
      const invalidRoutings = ['123456789', '000000000', '111111111', '999999999'];
      if (invalidRoutings.includes(cleanedRouting)) {
        errors.routingNumber = 'Invalid routing number';
      }
    }
    
    return errors;
  };

  // Enhanced IBAN validation for international accounts
  const validateIBAN = (iban) => {
    if (!iban) return true; // Optional field
    
    const cleanedIban = iban.replace(/\s+/g, '').toUpperCase();
    
    // Basic format check
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanedIban)) {
      return false;
    }
    
    // Length check based on country
    const lengths = {
      'AD': 24, 'AE': 23, 'AL': 28, 'AT': 20, 'AZ': 28, 'BA': 20, 'BE': 16,
      'BG': 22, 'BH': 22, 'BR': 29, 'BY': 28, 'CH': 21, 'CR': 22, 'CY': 28,
      'CZ': 24, 'DE': 22, 'DK': 18, 'DO': 28, 'EE': 20, 'EG': 29, 'ES': 24,
      'FI': 18, 'FO': 18, 'FR': 27, 'GB': 22, 'GE': 22, 'GI': 23, 'GL': 18,
      'GR': 27, 'GT': 28, 'HR': 21, 'HU': 28, 'IE': 22, 'IL': 23, 'IS': 26,
      'IT': 27, 'JO': 30, 'KW': 30, 'KZ': 20, 'LB': 28, 'LC': 32, 'LI': 21,
      'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27, 'MD': 24, 'ME': 22, 'MK': 19,
      'MR': 27, 'MT': 31, 'MU': 30, 'NL': 18, 'NO': 15, 'PK': 24, 'PL': 28,
      'PS': 29, 'PT': 25, 'QA': 29, 'RO': 24, 'RS': 22, 'SA': 24, 'SE': 24,
      'SI': 19, 'SK': 24, 'SM': 27, 'TN': 24, 'TR': 26, 'UA': 29, 'VG': 24,
      'XK': 20
    };
    
    const countryCode = cleanedIban.substring(0, 2);
    const expectedLength = lengths[countryCode];
    
    if (expectedLength && cleanedIban.length !== expectedLength) {
      return false;
    }
    
    // IBAN checksum validation (simplified)
    const rearranged = cleanedIban.substring(4) + cleanedIban.substring(0, 4);
    let numericString = '';
    
    for (let i = 0; i < rearranged.length; i++) {
      const char = rearranged[i];
      if (/[A-Z]/.test(char)) {
        numericString += (char.charCodeAt(0) - 55).toString();
      } else {
        numericString += char;
      }
    }
    
    // Mod 97 check (simplified for large numbers)
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i])) % 97;
    }
    
    return remainder === 1;
  };

  const validatePaymentFields = () => {
    const newErrors = {};

    // Force cash-only payment method
    if (form.paymentMethod !== 'cash') {
      newErrors.paymentMethod = 'Only Cash on Delivery is currently available';
      setForm(prev => ({ ...prev, paymentMethod: 'cash' }));
    }

    // Cash on delivery doesn't require additional validation
    return newErrors;
  };

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!form.name.trim()) newErrors.name = 'Name is required';
      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        newErrors.email = 'Email format is invalid';
      }
      if (!form.phone.trim()) {
        newErrors.phone = 'Phone is required';
      } else if (!isValidPhoneNumber(form.phone)) {
        newErrors.phone = 'Please enter a valid phone number (Pakistani: +92xxxxxxxxxx or 0xxxxxxxxxx)';
      }
    }

    if (step === 2) {
      if (!form.street.trim()) newErrors.street = 'Street address is required';
      if (!form.city.trim()) newErrors.city = 'City is required';
      if (!form.state.trim()) newErrors.state = 'State is required';
      if (!form.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
      if (!form.country.trim()) newErrors.country = 'Country is required';
    }

    if (step === 3) {
      const paymentErrors = validatePaymentFields();
      Object.assign(newErrors, paymentErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Payment processing simulation
  const processPayment = async (paymentData, orderTotal) => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (paymentData.method === 'credit') {
      // Simulate credit card processing
      const cardNumber = paymentData.cardNumber.replace(/\s+/g, '');
      
      // Test invalid card numbers
      if (cardNumber === '1234567890123456') {
        throw new Error('Invalid card number. Please use a valid test card.');
      }
      
      if (cardNumber === '4000000000000002') {
        throw new Error('Card declined. Please try a different card.');
      }
      
      if (cardNumber === '4000000000000119') {
        throw new Error('Processing error. Please try again.');
      }
      
      // Simulate successful processing for valid test cards
      const testCards = [
        '4111111111111111', // Visa
        '5555555555554444', // MasterCard
        '378282246310005',  // Amex
        '6011111111111117'  // Discover
      ];
      
      if (testCards.some(testCard => cardNumber === testCard)) {
        return {
          success: true,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Payment processed successfully',
          amount: orderTotal
        };
      }
      
      // For other card numbers, simulate random success/failure
      if (Math.random() < 0.8) {
        return {
          success: true,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Payment processed successfully',
          amount: orderTotal
        };
      } else {
        throw new Error('Payment failed. Please check your card details and try again.');
      }
    }
    
    if (paymentData.method === 'bank') {
      // Simulate bank transfer processing with enhanced validation
      const accountNumber = paymentData.accountNumber.replace(/\s+/g, '');
      const routingNumber = paymentData.routingNumber.replace(/\s+/g, '');
      
      // Additional runtime validation for bank transfers
      if (accountNumber === '0000000000000000') {
        throw new Error('Invalid account number. Account cannot be all zeros.');
      }
      
      if (routingNumber === '123456789' || routingNumber === '000000000') {
        throw new Error('Invalid routing number. Please check your bank details.');
      }
      
      // Simulate bank verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate bank response (90% success rate for valid inputs)
      if (Math.random() < 0.9) {
        return {
          success: true,
          transactionId: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Bank transfer initiated successfully. Please complete the transfer within 24 hours using the provided reference number.',
          amount: orderTotal,
          bankDetails: {
            accountNumber: `****${accountNumber.slice(-4)}`,
            routingNumber: routingNumber,
            bankName: paymentData.bankName
          }
        };
      } else {
        throw new Error('Bank transfer failed. Please verify your account details and try again.');
      }
    }
    
    if (paymentData.method === 'jazzcash' || paymentData.method === 'easypaisa') {
      // Simulate mobile wallet processing
      const walletNumber = paymentData.walletNumber.replace(/\s+/g, '');
      
      // Test invalid wallet numbers
      if (walletNumber === '03000000000') {
        throw new Error('Invalid wallet number. Please check and try again.');
      }
      
      if (paymentData.walletPin === '0000') {
        throw new Error('Invalid PIN. Please enter the correct PIN.');
      }
      
      return {
        success: true,
        transactionId: `${paymentData.method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: `${paymentData.method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} payment successful`,
        amount: orderTotal
      };
    }
    
    // Cash on delivery - no processing needed
    return {
      success: true,
      transactionId: `cod_${Date.now()}`,
      message: 'Order placed successfully. Pay on delivery.',
      amount: orderTotal
    };
  };

  // Order submission
  const handleSubmitOrder = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      // Prepare payment data based on selected method
      let paymentData = {
        method: form.paymentMethod
      };

      if (form.paymentMethod === 'credit') {
        paymentData = {
          ...paymentData,
          cardNumber: form.cardNumber,
          cardHolderName: form.cardHolderName,
          expiryMonth: form.expiryMonth,
          expiryYear: form.expiryYear,
          cvv: form.cvv
        };
      } else if (form.paymentMethod === 'bank') {
        paymentData = {
          ...paymentData,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          accountHolderName: form.accountHolderName,
          routingNumber: form.routingNumber
        };
      } else if (form.paymentMethod === 'jazzcash' || form.paymentMethod === 'easypaisa') {
        paymentData = {
          ...paymentData,
          walletNumber: form.walletNumber,
          walletPin: form.walletPin
        };
      }

      // Process payment first (except for cash on delivery)
      let paymentResult = null;
      if (form.paymentMethod !== 'cash') {
        try {
          console.log('Processing payment...');
          paymentResult = await processPayment(paymentData, orderTotals.total);
          console.log('Payment processed:', paymentResult);
        } catch (paymentError) {
          console.error('Payment failed:', paymentError);
          alert(`Payment Failed: ${paymentError.message}`);
          return;
        }
      }

      const orderData = {
        userId: user?._id,
        items: cartItems.map(item => {
          const productData = item.productData || item;
          return {
            productId: productData?._id || item._id || item.id,
            name: productData?.title || productData?.name || item.title || item.name,
            price: productData?.price || item.price,
            quantity: item.quantity,
            image: productData?.image || item.image,
            // Include vendor information for proper order processing
            vendor: productData?.vendor?._id || item.vendor?._id,
            handledBy: productData?.vendor ? 'vendor' : 'admin',
            assignedVendor: productData?.vendor?._id || item.vendor?._id
          };
        }),
        customerInfo: {
          name: form.name,
          // Always use logged-in user's email if authenticated, otherwise use form email
          email: user?.email || form.email,
          phone: form.phone
        },
        shippingInfo: {
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          country: form.country,
          method: form.shippingMethod
        },
        paymentInfo: {
          method: form.paymentMethod,
          ...(paymentResult && {
            transactionId: paymentResult.transactionId,
            paymentStatus: 'completed'
          })
        },
        totals: orderTotals,
        // Include order type analysis for admin panel
        orderType: cartAnalysis.type,
        orderTypeDisplay: getOrderTypeDisplayName(cartAnalysis.type),
        vendorBreakdown: {
          adminItems: cartAnalysis.adminItems.length,
          vendorGroups: cartAnalysis.vendorGroups.length,
          totalVendors: cartAnalysis.totalVendors
        }
      };

      console.log('Submitting order data:', orderData);

      // Create order and get the response with order number
      const orderResponse = await OrderService.createOrder(orderData);
      console.log('Order created successfully:', orderResponse);
      
      // Clear cart after successful order
      console.log('Clearing cart...');
      await clearCart();
      console.log('Cart cleared');
      
      // Show success message for payment
      if (paymentResult) {
        alert(`Payment Successful! ${paymentResult.message}`);
      }
      
      // Navigate to order confirmation page with order data
      const orderNumber = orderResponse.orderNumber || orderResponse.order?.orderNumber;
      console.log('Order number:', orderNumber);
      
      if (orderNumber) {
        console.log('Navigating to order confirmation with number:', orderNumber);
        setOrderCompleted(true); // Set flag before navigation
        navigate(`/order-confirmation/${orderNumber}`, {
          state: { 
            order: orderResponse.order || orderResponse,
            orderData: orderData,
            paymentResult: paymentResult
          }
        });
      } else {
        console.log('No order number found, using fallback');
        setOrderCompleted(true); // Set flag before navigation
        // Fallback if order number is missing
        navigate('/order-confirmation/IT-TEMP-ORDER', {
          state: { 
            order: orderResponse,
            orderData: orderData,
            paymentResult: paymentResult
          }
        });
      }

    } catch (error) {
      console.error('Order submission failed:', error);
      console.error('Error details:', error.message);
      console.error('Error response:', error.response?.data);
      alert(`Failed to place order: ${error.message || 'Unknown error'}. Please check console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!cartStats || cartStats.isEmpty || !cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {!cartStats ? 'Loading cart...' : 'Your cart is empty'}
          </h2>
          {cartStats && cartStats.isEmpty && (
            <button
              onClick={() => navigate('/products')}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
            >
              Continue Shopping
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Left Column - Step Content */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Customer Information */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="John Doe"
                    />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="john@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
                    {!errors.email && form.email && !/\S+@\S+\.\S+/.test(form.email) && (
                      <p className="text-yellow-600 text-xs">Please enter a valid email address</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="+1 (555) 123-4567 or 1234567890"
                    />
                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                    {!errors.phone && form.phone && !isValidPhoneNumber(form.phone) && (
                      <p className="text-yellow-600 text-xs">Formats: +92xxxxxxxxxx, 0xxxxxxxxxx, or international +country code</p>
                    )}
                    {!errors.phone && !form.phone && (
                      <p className="text-gray-500 text-xs">Pakistani: +92xxxxxxxxxx or 0xxxxxxxxxx, International: +country code</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={nextStep}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Continue to Address
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Address Information */}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.street}
                      onChange={(e) => setForm(prev => ({ ...prev, street: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.street ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter your complete address"
                    />
                    {errors.street && <p className="text-red-500 text-xs">{errors.street}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter your city"
                    />
                    {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="State"
                    />
                    {errors.state && <p className="text-red-500 text-xs">{errors.state}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.zipCode}
                      onChange={(e) => setForm(prev => ({ ...prev, zipCode: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="ZIP"
                    />
                    {errors.zipCode && <p className="text-red-500 text-xs">{errors.zipCode}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm(prev => ({ ...prev, country: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.country ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select Country</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="Afghanistan">Afghanistan</option>
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="India">India</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Turkey">Turkey</option>
                      <option value="China">China</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Other">Other</option>
                      <option value="Bulgaria">Bulgaria</option>
                      <option value="Cambodia">Cambodia</option>
                      <option value="Canada">Canada</option>
                      <option value="Chile">Chile</option>
                      <option value="China">China</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Croatia">Croatia</option>
                      <option value="Czech Republic">Czech Republic</option>
                      <option value="Denmark">Denmark</option>
                      <option value="Egypt">Egypt</option>
                      <option value="Estonia">Estonia</option>
                      <option value="Ethiopia">Ethiopia</option>
                      <option value="Finland">Finland</option>
                      <option value="France">France</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Germany">Germany</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Greece">Greece</option>
                      <option value="Hungary">Hungary</option>
                      <option value="Iceland">Iceland</option>
                      <option value="India">India</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Iran">Iran</option>
                      <option value="Iraq">Iraq</option>
                      <option value="Ireland">Ireland</option>
                      <option value="Israel">Israel</option>
                      <option value="Italy">Italy</option>
                      <option value="Japan">Japan</option>
                      <option value="Jordan">Jordan</option>
                      <option value="Kazakhstan">Kazakhstan</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Latvia">Latvia</option>
                      <option value="Lebanon">Lebanon</option>
                      <option value="Lithuania">Lithuania</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Morocco">Morocco</option>
                      <option value="Nepal">Nepal</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Norway">Norway</option>
                      <option value="Oman">Oman</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Poland">Poland</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Romania">Romania</option>
                      <option value="Russia">Russia</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Slovakia">Slovakia</option>
                      <option value="Slovenia">Slovenia</option>
                      <option value="South Africa">South Africa</option>
                      <option value="South Korea">South Korea</option>
                      <option value="Spain">Spain</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Turkey">Turkey</option>
                      <option value="Ukraine">Ukraine</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Vietnam">Vietnam</option>
                    </select>
                    {errors.country && <p className="text-red-500 text-xs">{errors.country}</p>}
                  </div>
                </div>
                
                <div className="flex justify-between mt-6">
                  <button
                    onClick={prevStep}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment Information */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
                
                {/* Payment Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Payment Method Notice
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Currently, only Cash on Delivery (COD) is available. Other payment methods will be available soon.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Payment Method Selection */}
                <div className="space-y-4 mb-6">
                  <PaymentMethod
                    id="cash"
                    title="Cash on Delivery"
                    description="Pay when you receive your order"
                    selected={form.paymentMethod === 'cash'}
                    onClick={() => setForm(prev => ({ ...prev, paymentMethod: 'cash' }))}
                  />
                  
                  {/* Temporarily disabled payment methods */}
                  <div className="opacity-50 pointer-events-none">
                    <PaymentMethod
                      id="credit"
                      title="Credit/Debit Card"
                      description="Coming Soon - Currently unavailable"
                      selected={false}
                      onClick={() => {}}
                    />
                  </div>
                  
                  <div className="opacity-50 pointer-events-none">
                    <PaymentMethod
                      id="bank"
                      title="Bank Transfer"
                      description="Coming Soon - Currently unavailable"
                      selected={false}
                      onClick={() => {}}
                    />
                  </div>
                  
                  <div className="opacity-50 pointer-events-none">
                    <PaymentMethod
                      id="jazzcash"
                      title="JazzCash"
                      description="Coming Soon - Currently unavailable"
                      selected={false}
                      onClick={() => {}}
                    />
                  </div>
                  
                  <div className="opacity-50 pointer-events-none">
                    <PaymentMethod
                      id="easypaisa"
                      title="EasyPaisa"
                      description="Coming Soon - Currently unavailable"
                      selected={false}
                      onClick={() => {}}
                    />
                  </div>
                </div>

                {/* Credit Card Form */}
                {form.paymentMethod === 'credit' && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <h3 className="font-medium text-gray-900 mb-3">Credit Card Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Card Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.cardNumber}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            setForm(prev => ({ ...prev, cardNumber: formatted }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        {form.cardNumber && (
                          <p className="text-sm text-gray-600">
                            Card Type: {getCardType(form.cardNumber)}
                          </p>
                        )}
                        {errors.cardNumber && <p className="text-red-500 text-xs">{errors.cardNumber}</p>}
                      </div>
                      
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Card Holder Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.cardHolderName}
                          onChange={(e) => setForm(prev => ({ ...prev, cardHolderName: e.target.value.toUpperCase() }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.cardHolderName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="JOHN DOE"
                        />
                        {errors.cardHolderName && <p className="text-red-500 text-xs">{errors.cardHolderName}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Expiry Month <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.expiryMonth}
                          onChange={(e) => setForm(prev => ({ ...prev, expiryMonth: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.expiryMonth ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Month</option>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {String(i + 1).padStart(2, '0')} - {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                          ))}
                        </select>
                        {errors.expiryMonth && <p className="text-red-500 text-xs">{errors.expiryMonth}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Expiry Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.expiryYear}
                          onChange={(e) => setForm(prev => ({ ...prev, expiryYear: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.expiryYear ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 15 }, (_, i) => {
                            const year = new Date().getFullYear() + i;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          })}
                        </select>
                        {errors.expiryYear && <p className="text-red-500 text-xs">{errors.expiryYear}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          CVV <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setForm(prev => ({ ...prev, cvv: value }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.cvv ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="123"
                          maxLength="4"
                        />
                        {errors.cvv && <p className="text-red-500 text-xs">{errors.cvv}</p>}
                      </div>
                    </div>
                    
                    {/* Test Card Numbers */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Test Card Numbers:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>Visa: 4111 1111 1111 1111</p>
                        <p>MasterCard: 5555 5555 5555 4444</p>
                        <p>Amex: 3782 8224 6310 005</p>
                        <p>Invalid: 1234 5678 9012 3456</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Transfer Form */}
                {form.paymentMethod === 'bank' && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <h3 className="font-medium text-gray-900 mb-3">Bank Transfer Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Bank Name <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={form.bankName}
                          onChange={(e) => setForm(prev => ({ ...prev, bankName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.bankName ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <option value="">Select Bank</option>
                          <option value="Chase Bank">Chase Bank</option>
                          <option value="Wells Fargo">Wells Fargo</option>
                          <option value="Bank of America">Bank of America</option>
                          <option value="Citibank">Citibank</option>
                          <option value="US Bank">US Bank</option>
                          <option value="PNC Bank">PNC Bank</option>
                          <option value="Capital One">Capital One</option>
                          <option value="TD Bank">TD Bank</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.bankName && <p className="text-red-500 text-xs">{errors.bankName}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.accountNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setForm(prev => ({ ...prev, accountNumber: value }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="1234567890123456"
                          maxLength="17"
                        />
                        {form.accountNumber && form.accountNumber.length >= 8 && (
                          <p className="text-green-600 text-xs">✓ Valid length</p>
                        )}
                        {errors.accountNumber && <p className="text-red-500 text-xs">{errors.accountNumber}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Account Holder Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.accountHolderName}
                          onChange={(e) => setForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.accountHolderName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="John Doe"
                        />
                        {errors.accountHolderName && <p className="text-red-500 text-xs">{errors.accountHolderName}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Routing Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.routingNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                            setForm(prev => ({ ...prev, routingNumber: value }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.routingNumber ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="021000021"
                          maxLength="9"
                        />
                        {form.routingNumber && form.routingNumber.length === 9 && (
                          <p className="text-green-600 text-xs">✓ Valid format</p>
                        )}
                        {errors.routingNumber && <p className="text-red-500 text-xs">{errors.routingNumber}</p>}
                      </div>
                    </div>
                    
                    {/* Test Bank Details */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Test Bank Account Details:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p><strong>Valid:</strong> Account: 1234567890123456, Routing: 021000021</p>
                        <p><strong>Valid:</strong> Account: 9876543210987654, Routing: 026009593</p>
                        <p><strong>Invalid:</strong> Account: 0000000000000000, Routing: 123456789</p>
                        <p><strong>Invalid:</strong> Account: 123456, Routing: 000000000</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Wallet Form */}
                {(form.paymentMethod === 'jazzcash' || form.paymentMethod === 'easypaisa') && (
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      {form.paymentMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.walletNumber}
                          onChange={(e) => setForm(prev => ({ ...prev, walletNumber: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.walletNumber ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="03XXXXXXXXX"
                        />
                        {errors.walletNumber && <p className="text-red-500 text-xs">{errors.walletNumber}</p>}
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          PIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={form.walletPin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setForm(prev => ({ ...prev, walletPin: value }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${errors.walletPin ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="Enter your PIN"
                          maxLength="6"
                        />
                        {errors.walletPin && <p className="text-red-500 text-xs">{errors.walletPin}</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mt-6">
                  <button
                    onClick={prevStep}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Order Review */}
            {currentStep === 4 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Review</h2>
                
                {/* Customer Details */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-sm text-gray-600">{form.name}</p>
                  <p className="text-sm text-gray-600">{form.email}</p>
                  <p className="text-sm text-gray-600">{form.phone}</p>
                </div>
                
                {/* Shipping Details */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                  <p className="text-sm text-gray-600">{form.street}</p>
                  <p className="text-sm text-gray-600">{form.city}, {form.state} {form.zipCode}</p>
                  <p className="text-sm text-gray-600">{form.country}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Shipping:</span> {form.shippingMethod === 'standard' ? 'Standard (5-7 days)' : 'Express (2-3 days)'}
                  </p>
                </div>
                
                {/* Payment Method */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Payment Method</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {form.paymentMethod === 'cash' && (
                      <p className="text-sm text-gray-600">Cash on Delivery</p>
                    )}
                    
                    {form.paymentMethod === 'credit' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">Credit/Debit Card</p>
                        <p className="text-sm text-gray-600">Card: ****{form.cardNumber.slice(-4)} ({getCardType(form.cardNumber)})</p>
                        <p className="text-sm text-gray-600">Name: {form.cardHolderName}</p>
                        <p className="text-sm text-gray-600">Expires: {form.expiryMonth}/{form.expiryYear}</p>
                      </div>
                    )}
                    
                    {form.paymentMethod === 'bank' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">Bank Transfer</p>
                        <p className="text-sm text-gray-600">Bank: {form.bankName}</p>
                        <p className="text-sm text-gray-600">Account: ****{form.accountNumber.slice(-4)}</p>
                        <p className="text-sm text-gray-600">Holder: {form.accountHolderName}</p>
                      </div>
                    )}
                    
                    {form.paymentMethod === 'jazzcash' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">JazzCash</p>
                        <p className="text-sm text-gray-600">Number: {form.walletNumber}</p>
                      </div>
                    )}
                    
                    {form.paymentMethod === 'easypaisa' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">EasyPaisa</p>
                        <p className="text-sm text-gray-600">Number: {form.walletNumber}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mixed Order Notification */}
                {cartAnalysis.notification && (
                  <div className="mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            {cartAnalysis.notification.title}
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p className="mb-3">{cartAnalysis.notification.message}</p>
                            <div className="space-y-1 mb-3">
                              {cartAnalysis.notification.breakdown.map((item, index) => (
                                <div key={index} className="flex items-center">
                                  <span className="w-3 h-3 rounded-full mr-2" style={{
                                    backgroundColor: item.color === 'blue' ? '#3B82F6' : '#8B5CF6'
                                  }}></span>
                                  <span>{item.text}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs bg-yellow-100 p-2 rounded border">
                              {cartAnalysis.notification.warning}
                            </p>
                            <div className="mt-2">
                              <p className="text-sm font-medium">
                                Delivery Estimate: {generateDeliveryEstimate(cartAnalysis)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between mt-6">
                  <button
                    onClick={prevStep}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : `${cartAnalysis.notification?.buttonText || 'Place Order'} - $${(cartStats?.totalPrice || 0).toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
            
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="lg:col-span-5 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
              
              {/* Items */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>
                
                {cartItems && cartItems.length > 0 ? cartItems.map((item, index) => {
                  const productData = item.productData || item;
                  
                  return (
                    <div key={item._id || productData._id || item.id || index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={getImageUrl('products', productData.images?.[0] || productData.image)}
                          alt={productData.title || productData.name || 'Product'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/no-image.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {productData.title || productData.name || 'Unknown Product'}
                        </h4>
                        <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        ${((productData.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>No items in cart</p>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${(cartStats.totalPrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-900">N/A</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${(cartStats.totalPrice || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Secure Checkout
                  </div>
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Money Back Guarantee
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-orange-400 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="font-medium">🎉 Order Placed Successfully!</div>
            <div className="text-sm opacity-90">✨ Discover more amazing products!</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
