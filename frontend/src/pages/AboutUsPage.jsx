import { useState, useEffect } from "react";

const AboutUsPage = () => {
  const [activeTimelineItem, setActiveTimelineItem] = useState(0);
  const [visibleStats, setVisibleStats] = useState(false);

  // SEO: Set document title and meta description
  useEffect(() => {
    document.title = "About Us - International Tijarat | Our Story & Mission";
    
    // Add meta description if not exists
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Learn about International Tijarat - a premium e-commerce platform connecting global customers with quality products. Discover our mission, values, and commitment to excellence.';
      document.head.appendChild(meta);
    }

    // Trigger stats animation on scroll
    const handleScroll = () => {
      const statsSection = document.getElementById('stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setVisibleStats(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const StatsCard = ({ number, label, prefix = "", suffix = "", delay = 0 }) => {
    const [displayNumber, setDisplayNumber] = useState(0);

    useEffect(() => {
      if (visibleStats) {
        const timer = setTimeout(() => {
          const targetNumber = parseInt(number.replace(/[^\d]/g, ''));
          const increment = targetNumber / 100;
          let current = 0;
          
          const interval = setInterval(() => {
            current += increment;
            if (current >= targetNumber) {
              setDisplayNumber(targetNumber);
              clearInterval(interval);
            } else {
              setDisplayNumber(Math.floor(current));
            }
          }, 20);

          return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timer);
      }
    }, [visibleStats, number, delay]);

    return (
      <div className="text-center transform hover:scale-105 transition-transform duration-300">
        <div className="text-4xl lg:text-5xl font-black text-gray-800 mb-2">
          {prefix}{displayNumber.toLocaleString()}{suffix}
        </div>
        <div className="text-gray-600 font-medium">{label}</div>
      </div>
    );
  };

  const ValueCard = ({ icon, title, description }) => (
    <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
      <div className="w-16 h-16 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );

  const TimelineItem = ({ year, title, description, isActive, onClick }) => (
    <div 
      className={`flex items-start cursor-pointer transition-all duration-300 p-4 rounded-xl ${
        isActive ? 'bg-orange-50 border border-orange-400' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className={`w-4 h-4 rounded-full mt-2 mr-4 flex-shrink-0 transition-all duration-300 ${
        isActive ? 'bg-orange-400 ring-4 ring-orange-200' : 'bg-gray-300'
      }`} />
      <div className="flex-1">
        <div className={`text-lg font-bold mb-1 transition-colors ${
          isActive ? 'text-orange-600' : 'text-gray-900'
        }`}>
          {year}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );

  const timelineData = [
    {
      year: "2019",
      title: "Foundation & Vision",
      description: "International Tijarat was founded with a simple yet ambitious vision: to connect customers worldwide with premium quality products through a seamless e-commerce experience."
    },
    {
      year: "2020",
      title: "Global Expansion",
      description: "Expanded our reach to 50+ countries, establishing partnerships with leading brands and manufacturers across different continents to ensure product authenticity and quality."
    },
    {
      year: "2021",
      title: "Technology Innovation",
      description: "Launched our advanced AI-powered recommendation system and implemented cutting-edge security measures, resulting in 99.9% customer satisfaction and zero security breaches."
    },
    {
      year: "2022",
      title: "Sustainability Initiative",
      description: "Introduced our green shipping program and sustainable packaging solutions, reducing our carbon footprint by 40% while maintaining premium delivery standards."
    },
    {
      year: "2023",
      title: "Market Leadership",
      description: "Achieved market leadership in premium e-commerce with 100K+ satisfied customers, 500+ brand partnerships, and recognition as 'E-commerce Platform of the Year'."
    },
    {
      year: "2024",
      title: "Future Ready",
      description: "Investing in next-generation technologies including AR shopping experiences, blockchain authentication, and AI-powered customer service to shape the future of online retail."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-100/30 to-slate-100/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-slate-100/30 to-gray-100/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-to-r from-orange-50/20 to-slate-50/20 rounded-full blur-2xl animate-pulse" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-orange-200/60 rounded-full animate-ping" />
      <div className="absolute top-40 right-32 w-1 h-1 bg-slate-200/60 rounded-full animate-ping" />
      <div className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-gray-200/60 rounded-full animate-ping" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-20 space-y-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-50 to-slate-100 border-2 border-orange-400 rounded-3xl shadow-lg mb-8 transform hover:scale-110 transition-transform duration-300">
            <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
            </svg>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-gray-900 tracking-tight">
            About
            <span className="block bg-gradient-to-r from-orange-400 via-slate-600 to-gray-700 bg-clip-text text-transparent">
              International Tijarat
            </span>
          </h1>
          
          <p className="text-2xl lg:text-3xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light">
            Connecting the world through premium e-commerce experiences since 2019
          </p>

          <div className="max-w-4xl mx-auto">
            <p className="text-xl text-gray-600 leading-relaxed">
              We are more than just an e-commerce platform. International Tijarat represents a commitment to excellence, 
              quality, and the belief that everyone deserves access to the world's finest products, regardless of their location.
            </p>
          </div>
        </div>

        {/* Mission & Vision Section */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-400 rounded-2xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              To democratize access to premium products worldwide by creating the most trusted, 
              innovative, and customer-centric e-commerce platform that bridges cultures and connects communities.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Global Access", "Quality Assurance", "Customer Trust", "Innovation"].map((tag) => (
                <span key={tag} className="px-4 py-2 bg-orange-50 text-orange-700 border border-orange-400 rounded-full text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              To become the world's most recognized platform for premium products, where quality meets convenience, 
              and where every transaction creates lasting relationships between brands and customers globally.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Market Leadership", "Global Recognition", "Premium Quality", "Lasting Relationships"].map((tag) => (
                <span key={tag} className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>



        {/* Core Values */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Our Core Values</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide every decision we make and every relationship we build
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>}
              title="Quality Excellence"
              description="We maintain the highest standards in product curation, ensuring every item meets our rigorous quality criteria before reaching our customers."
            />

            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>}
              title="Global Accessibility"
              description="Breaking down geographical barriers to make premium products accessible to customers worldwide, fostering international commerce and cultural exchange."
            />

            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>}
              title="Innovation Drive"
              description="Continuously evolving our platform with cutting-edge technology to enhance user experience and set new industry standards."
            />

            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>}
              title="Customer Centricity"
              description="Every decision we make starts with our customers. Their satisfaction, trust, and success are the foundation of our business."
            />

            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>}
              title="Transparency"
              description="Building trust through honest communication, clear policies, and transparent business practices in all our operations."
            />

            <ValueCard
              icon={<svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>}
              title="Sustainability"
              description="Committed to environmentally responsible practices, from eco-friendly packaging to carbon-neutral shipping options."
            />
          </div>
        </div>

        {/* Company Timeline - FIXED SECTION */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Our Journey</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a bold vision to global impact - the milestones that shaped International Tijarat
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 to-orange-300"></div>
              <div className="space-y-2">
                {timelineData.map((item, index) => (
                  <TimelineItem
                    key={index}
                    year={item.year}
                    title={item.title}
                    description={item.description}
                    isActive={activeTimelineItem === index}
                    onClick={() => setActiveTimelineItem(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white rounded-3xl p-12 shadow-lg border border-gray-200">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Join Our Journey</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Be part of the future of e-commerce. Whether you're a customer, partner, or potential team member, 
              there's a place for you in the International Tijarat family.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => window.open('/products')}
                className="px-8 py-4 bg-orange-400 text-white font-bold rounded-2xl hover:bg-orange-500 transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
              >
                Explore Products
              </button>
              <button 
                onClick={() => window.open('/ContactUsPage')}
                className="px-8 py-4 border-2 border-orange-400 text-orange-400 font-bold rounded-2xl hover:bg-orange-400 hover:text-white transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                Partner With Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUsPage;