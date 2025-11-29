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

// Ultra-lightweight skeleton - no heavy animations - Phase 3.4: Reserve space to prevent CLS
const SectionSkeleton = () => (
  <div className="w-full py-8 px-4 bg-gray-50" style={{ minHeight: '320px' }}>
    <div className="max-w-7xl mx-auto">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded border border-gray-100" style={{ aspectRatio: '1/1.3', minHeight: '240px' }}></div>
        ))}
      </div>
    </div>
  </div>
);

const Home = () => {
  // Phase 4.3: Optimized React Query caching for homepage data
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['homepage-all'],
    queryFn: async () => {
      const { data } = await axios.get('/api/homepage/all-data');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - data considered fresh
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache (renamed from cacheTime in v5)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
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