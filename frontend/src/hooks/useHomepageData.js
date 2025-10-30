import { useState, useEffect, useRef } from 'react';
import { getApiUrl } from '../config';

const CACHE_DURATION = 60000; // 60 seconds client-side cache

/**
 * Custom hook for fetching all homepage data in a single API call
 * This reduces network requests from 4-5 to just 1, significantly improving page load time
 * 
 * @returns {Object} { banners, categories, cards, staticCategories, loading, error }
 */
export const useHomepageData = () => {
  const [data, setData] = useState({
    banners: [],
    categories: [],
    cards: [],
    staticCategories: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // In-memory cache
  const cache = useRef({
    data: null,
    timestamp: 0
  });

  useEffect(() => {
    const fetchHomepageData = async () => {
      // Check cache first
      const now = Date.now();
      if (cache.current.data && now - cache.current.timestamp < CACHE_DURATION) {
        console.log('✅ Using cached homepage data (client-side)');
        setData(cache.current.data);
        setLoading(false);
        return;
      }

      console.log('📡 Fetching combined homepage data...');
      setLoading(true);

      try {
        const response = await fetch(getApiUrl('homepage/all'));
        const result = await response.json();

        if (result.success && result.data) {
          const homepageData = {
            banners: result.data.banners || [],
            categories: result.data.categories || [],
            cards: result.data.cards?.cards || [],
            staticCategories: result.data.staticCategories?.categories || []
          };

          setData(homepageData);
          
          // Update cache
          cache.current = {
            data: homepageData,
            timestamp: now
          };

          console.log(`✅ Homepage data loaded successfully (${result.cached ? 'server-cached' : 'fresh'}):`, {
            banners: homepageData.banners.length,
            categories: homepageData.categories.length,
            cards: homepageData.cards.length,
            staticCategories: homepageData.staticCategories.length
          });
        } else {
          throw new Error(result.error || 'Failed to fetch homepage data');
        }
      } catch (err) {
        console.error('❌ Error fetching homepage data:', err);
        setError(err.message);
        
        // Set empty arrays on error to prevent crashes
        setData({
          banners: [],
          categories: [],
          cards: [],
          staticCategories: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();
  }, []);

  return {
    banners: data.banners,
    categories: data.categories,
    cards: data.cards,
    staticCategories: data.staticCategories,
    loading,
    error
  };
};

export default useHomepageData;
