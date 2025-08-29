// src/pages/Home.jsx
import React from 'react';
import HeroSection from '../components/HeroSection';
import CategoryCarousel from '../components/CategoryCarousel';
import PremiumProductDisplay from '../components/PremiumProductDisplay';
import AmazonStyleProductDisplay from '../components/AmazonStyleProductDisplay';
import ModernProductGrid from '../components/ModernProductGrid';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Category Carousel Section */}
      <CategoryCarousel />

      {/* Amazon-Style Product Display Section */}
      <AmazonStyleProductDisplay />

      {/* Premium Product Display Section */}
      <PremiumProductDisplay />
      
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Home;