// src/pages/Home.jsx
import React, { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Critical components - load immediately
import HeroSection from '../components/HeroSection';
import CategoryCarousel from '../components/CategoryCarousel';
import Footer from '../components/Footer';

// Non-critical components - lazy load
const PremiumProductDisplay = lazy(() => import('../components/PremiumProductDisplay'));
const AmazonStyleProductDisplay = lazy(() => import('../components/AmazonStyleProductDisplay'));
const ModernProductGrid = lazy(() => import('../components/ModernProductGrid'));

// Ultra-lightweight skeleton - no heavy animations
const SectionSkeleton = () => (
  <div className="w-full py-8 px-4 bg-gray-50">
    <div className="max-w-7xl mx-auto">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded h-48 border border-gray-100"></div>
        ))}
      </div>
    </div>
  </div>
);

const Home = () => {
  // Single API call for all homepage data
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['homepage-all'],
    queryFn: async () => {
      const { data } = await axios.get('/api/homepage/all-data');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    // Render immediately with empty data, update when loaded
    placeholderData: { banners: [], categories: [] }
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - renders immediately with placeholder */}
      <HeroSection banners={homepageData?.banners || []} />
      
      {/* Category Carousel - renders immediately */}
      <CategoryCarousel categories={homepageData?.categories || []} />

      {/* Lazy loaded sections - only if data is ready */}
      {!isLoading && (
        <>
          <Suspense fallback={<SectionSkeleton />}>
            <AmazonStyleProductDisplay staticCategories={homepageData?.staticCategories || []} />
          </Suspense>

          <Suspense fallback={<SectionSkeleton />}>
            <PremiumProductDisplay 
              premiumProducts={homepageData?.specialProducts?.premium || []}
              featuredProducts={homepageData?.specialProducts?.featured || []}
              newArrivals={homepageData?.specialProducts?.newArrivals || []}
            />
          </Suspense>
        </>
      )}
      
      <Footer />
    </div>
  );
};

export default Home;