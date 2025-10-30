// src/pages/Home.jsx
import React, { lazy, Suspense } from 'react';

// Only HeroSection loads immediately for LCP (Largest Contentful Paint)
import HeroSection from '../components/HeroSection';

// Lazy load below-the-fold components for better initial page load
const CategoryCarousel = lazy(() => import('../components/CategoryCarousel'));
const AmazonStyleProductDisplay = lazy(() => import('../components/AmazonStyleProductDisplay'));
const PremiumProductDisplay = lazy(() => import('../components/PremiumProductDisplay'));
const Footer = lazy(() => import('../components/Footer'));

// Lightweight loading skeleton
const ComponentLoader = () => (
  <div className="w-full py-8 flex justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Load immediately (above the fold) */}
      <HeroSection />
      
      {/* Category Carousel Section - Lazy load (below the fold) */}
      <Suspense fallback={<ComponentLoader />}>
        <CategoryCarousel />
      </Suspense>

      {/* Amazon-Style Product Display Section - Lazy load */}
      <Suspense fallback={<ComponentLoader />}>
        <AmazonStyleProductDisplay />
      </Suspense>

      {/* Premium Product Display Section - Lazy load */}
      <Suspense fallback={<ComponentLoader />}>
        <PremiumProductDisplay />
      </Suspense>
      
      {/* Footer Section - Lazy load */}
      <Suspense fallback={<ComponentLoader />}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Home;