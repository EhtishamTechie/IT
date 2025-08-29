import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { contactAPI } from '../services/contactAPI';

// Validation utilities - optimized with memoization
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Phone number validation function
const validatePhone = (phone) => {
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

// Mock API call - simulated with realistic timing
const submitContactForm = async (formData) => {
  try {
    const response = await contactAPI.submitContact(formData);
    return response.data;
  } catch (error) {
    console.error('Contact form submission error:', error);
    const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
    throw new Error(errorMessage);
  }
};

// Move FormField outside the component to prevent recreation
const FormField = memo(({ label, name, type = "text", required = false, error, placeholder, children, value, onChange, ...props }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children || (
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border rounded-md py-2.5 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
        }`}
        {...props}
      />
    )}
    {error && (
      <p className="text-red-600 text-sm flex items-center mt-1">
        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </p>
    )}
  </div>
));

const ContactUsPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    inquiryType: "general"
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMessage, setSubmitMessage] = useState("");

  // SEO optimization
  useEffect(() => {
    document.title = "Contact Us - International Tijarat | Customer Support";
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Contact International Tijarat for 24/7 customer support, business inquiries, and technical assistance. Get help from our expert team.';
      document.head.appendChild(meta);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, []); // Remove errors dependency to prevent re-creation

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number (Pakistani: +92xxxxxxxxxx or 0xxxxxxxxxx)";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = "Subject must be at least 5 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    return newErrors;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    try {
      const response = await submitContactForm(formData);
      setSubmitStatus('success');
      setSubmitMessage(response.message);
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        inquiryType: "general"
      });
      setErrors({});
      
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm]);

  // Memoized components for better performance
  const ContactCard = ({ icon, title, content, href, linkText }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-3 leading-relaxed">{content}</p>
          {href && linkText && (
            <a 
              href={href}
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
            >
              {linkText}
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
        >
          <span className="font-medium text-gray-900 pr-4">{question}</span>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="px-6 pb-4 border-t border-gray-100">
            <p className="text-gray-600 leading-relaxed pt-4">{answer}</p>
          </div>
        )}
      </div>
    );
  };

  const inquiryTypes = [
    { value: "general", label: "General Inquiry" },
    { value: "support", label: "Customer Support" },
    { value: "business", label: "Business Partnership" },
    { value: "technical", label: "Technical Support" },
    { value: "billing", label: "Billing & Orders" },
    { value: "feedback", label: "Feedback & Suggestions" }
  ];

  const contactMethods = [
    {
      icon: <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>,
      title: "Phone Support",
      content: "Speak with our customer service team. Available 24/7 for urgent inquiries.",
      href: "tel:+923005567507",
      linkText: "+92 300 5567507"
    },
    {
      icon: <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      title: "Email Support",
      content: "Send us a detailed message and we'll respond within 24 hours.",
      href: "mailto:support@internationaltijarat.com",
      linkText: "support@internationaltijarat.com"
    },
    {
      icon: <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>,
      title: "Live Chat",
      content: "Chat with our support team in real-time. Available during business hours.",
      href: "#",
      linkText: "Start Live Chat"
    }
  ];

  const faqs = [
    {
      question: "What are your shipping policies?",
      answer: "We offer free standard shipping on orders over $35. Standard shipping takes 3-5 business days, while expedited shipping takes 1-2 business days. All orders are processed within 24 hours and tracking information is provided via email."
    },
    {
      question: "What is your return policy?",
      answer: "We offer a 30-day return policy for most items in original condition. Items must be unused and in original packaging. Return shipping is free for eligible returns when using our prepaid return labels."
    },
    {
      question: "How can I track my order?",
      answer: "Once your order ships, you'll receive a tracking number via email and SMS. You can also track your order by logging into your account or using our order tracking page with your order number."
    },
    {
      question: "Do you offer international shipping?",
      answer: "Yes! We ship to over 100 countries worldwide. International shipping rates and delivery times vary by destination. All international orders include tracking and are subject to local customs duties."
    },
    {
      question: "How do I become a business partner?",
      answer: "We welcome business partnerships! Please contact us through the contact options above selecting 'Business Partnership', or email partnerships@internationaltijarat.com with your proposal and company information."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact Us - International Tijarat",
          "description": "Contact International Tijarat for customer support and business inquiries",
          "mainEntity": {
            "@type": "Organization",
            "name": "International Tijarat",
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+92-300-5567507",
              "contactType": "customer service",
              "email": "support@internationaltijarat.com",
              "availableLanguage": ["English"],
              "hoursAvailable": "24/7"
            }
          }
        })}
      </script>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Contact Customer Service
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              We're here to help with any questions about your orders, our products, or our services.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Contact Methods */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {contactMethods.map((method, index) => (
            <ContactCard key={index} {...method} />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    label="Full Name"
                    name="name"
                    required
                    placeholder="Enter your full name"
                    error={errors.name}
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    error={errors.email}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    placeholder="(Optional) Your phone number"
                    error={errors.phone}
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                  <FormField
                    label="Inquiry Type"
                    name="inquiryType"
                    error={errors.inquiryType}
                  >
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {inquiryTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField
                  label="Subject"
                  name="subject"
                  required
                  placeholder="Brief description of your inquiry"
                  error={errors.subject}
                  value={formData.subject}
                  onChange={handleInputChange}
                />

                <FormField
                  label="Message"
                  name="message"
                  required
                  placeholder="Please provide details about your inquiry..."
                  error={errors.message}
                >
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows="6"
                    placeholder="Please provide details about your inquiry..."
                    className={`w-full border rounded-md py-2.5 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none ${
                      errors.message ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                    }`}
                  />
                </FormField>

                {/* Submit Status */}
                {submitStatus && (
                  <div className={`p-4 rounded-md flex items-start ${
                    submitStatus === 'success' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <svg className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                      submitStatus === 'success' ? 'text-green-500' : 'text-red-500'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {submitStatus === 'success' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    <p className={`text-sm ${submitStatus === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {submitMessage}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Sending message...
                    </div>
                  ) : (
                    "Send message"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business Hours */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business Hours
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monday - Friday</span>
                  <span className="font-medium text-gray-900">9:00 AM - 8:00 PM PST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Saturday</span>
                  <span className="font-medium text-gray-900">10:00 AM - 6:00 PM PST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sunday</span>
                  <span className="font-medium text-gray-900">12:00 PM - 5:00 PM PST</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-blue-700 text-sm flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Phone support available 24/7 for urgent issues
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Why customers trust us</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-orange-600 mr-3">24/7</div>
                  <div className="text-sm text-gray-600">Customer Support</div>
                </div>
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-orange-600 mr-3">99.5%</div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                </div>
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-orange-600 mr-3">100+</div>
                  <div className="text-sm text-gray-600">Countries Served</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions. Can't find what you're looking for? Use the contact options above.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;