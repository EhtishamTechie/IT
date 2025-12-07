import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, debugAnalytics } from '../utils/analytics';

/**
 * Custom hook for GTM analytics integration
 * Automatically tracks page views on route changes for SPA
 * 
 * Note: This hook must be used inside a Router context (BrowserRouter)
 * Returns null if Router context is not available (graceful degradation)
 */
export const useAnalytics = () => {
  // Use try-catch to handle Router context not being available yet
  let location = null;
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    location = useLocation();
  } catch (error) {
    // Router context not available, analytics won't track
    // This is expected during SSR or before Router is mounted
    return null;
  }

  useEffect(() => {
    if (!location) return;
    
    // Track page view on route change (important for SPA)
    const pagePath = location.pathname + location.search;
    
    // Small delay to ensure page title is updated by React Helmet
    setTimeout(() => {
      const pageTitle = document.title;
      trackPageView(pagePath, pageTitle);
    }, 100);
  }, [location]);

  useEffect(() => {
    // Debug GTM setup in development only
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        debugAnalytics();
        
        // Additional debugging: Check GTM container loading
        const gtmContainer = 'GTM-K55PGMBD';
        const gtmScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
        
        if (gtmScript && gtmScript.src.includes(gtmContainer)) {
          console.log('✅ GTM Container loaded correctly:', gtmContainer);
        } else {
          console.error('❌ GTM Container not found or wrong ID');
        }
      }, 2000);
    }
  }, []);

  return null;
};

export default useAnalytics;