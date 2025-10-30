// src/pages/Home.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import HeroSection from '../components/HeroSection';
import CategoryCarousel from '../components/CategoryCarousel';
import PremiumProductDisplay from '../components/PremiumProductDisplay';
import AmazonStyleProductDisplay from '../components/AmazonStyleProductDisplay';
import ModernProductGrid from '../components/ModernProductGrid';
import Footer from '../components/Footer';

const Home = () => {
  // Single API call for all homepage data
  const { data: homepageData, isLoading, error } = useQuery({
    queryKey: ['homepage-all'],
    queryFn: async () => {
      const { data } = await axios.get('/api/homepage/all-data');
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error loading homepage data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Pass banners data */}
      <HeroSection banners={homepageData?.banners || []} />
      
      {/* Category Carousel Section - Pass categories data */}
      <CategoryCarousel categories={homepageData?.categories || []} />

      {/* Amazon-Style Product Display Section - Pass static categories data */}
      <AmazonStyleProductDisplay staticCategories={homepageData?.staticCategories || []} />

      {/* Premium Product Display Section - Pass special products data */}
      <PremiumProductDisplay 
        premiumProducts={homepageData?.specialProducts?.premium || []}
        featuredProducts={homepageData?.specialProducts?.featured || []}
        newArrivals={homepageData?.specialProducts?.newArrivals || []}
      />
      
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Home;