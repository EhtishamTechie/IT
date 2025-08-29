import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import { getApiUrl, getImageUrl } from '../config';

const CACHE_DURATION = 30000; // 30 seconds

// Simple lazy loading hook
const useLazyLoading = () => {
  const [inView, setInView] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, inView];
};

// Lazy loading image component
const LazyImage = ({ src, alt, className, ...props }) => {
  const [imageRef, inView] = useLazyLoading();
  const [loaded, setLoaded] = useState(false);

  return (
    <div ref={imageRef} className={className}>
      {inView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          {...props}
        />
      )}
    </div>
  );
};

const AmazonStyleProductDisplay = () => {
  const navigate = useNavigate();
  const [scrollPositions, setScrollPositions] = useState({});
  const [loading, setLoading] = useState(true);
  const [productSections, setProductSections] = useState([]);
  
  // Cache
  const cache = useRef({
    productSections: { data: null, timestamp: 0 }
  });

  useEffect(() => {
    const fetchProductSections = async () => {
      const now = Date.now();
      if (cache.current.productSections.data && now - cache.current.productSections.timestamp < CACHE_DURATION) {
        console.log('Using cached product sections data');
        setProductSections(cache.current.productSections.data);
        setLoading(false);
        return;
      }

      console.log('Fetching fresh product sections data');
      try {
        const response = await API.get(getApiUrl('homepage/static-categories'));
        if (response.data.success) {
          const sortedCategories = response.data.categories.sort((a, b) => a.displayOrder - b.displayOrder);
          const sections = sortedCategories.map(cat => ({
            id: cat._id,
            _id: cat.category._id,
            title: cat.category.name,
            linkText: 'See all',
            products: cat.selectedProducts.map(product => ({
              id: product._id,
              title: product.title,
              image: product.images && product.images.length > 0 ? product.images[0] : product.image
            }))
          }));
          setProductSections(sections);
          
          // Update cache
          cache.current.productSections = {
            data: sections,
            timestamp: now
          };
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product sections:', error);
        setLoading(false);
      }
    };

    fetchProductSections();
  }, []);

  // Initial product data for development
  const initialSections = [
    {
      id: 'clothing',
      title: 'Best Sellers in Clothing, Shoes & Jewelry',
      linkText: 'See all',
      products: [
        {
          id: 1,
          image: "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 2,
          image: "https://images.pexels.com/photos/1670766/pexels-photo-1670766.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 3,
          image: "https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 4,
          image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 5,
          image: "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 6,
          image: "https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 7,
          image: "https://images.pexels.com/photos/1936848/pexels-photo-1936848.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 8,
          image: "https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        }
      ]
    },
    {
      id: 'gaming',
      title: 'Most wished for in Video Games',
      linkText: 'Discover more',
      products: [
        {
          id: 9,
          image: "https://images.pexels.com/photos/1464819/pexels-photo-1464819.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 10,
          image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 11,
          image: "https://images.pexels.com/photos/1365795/pexels-photo-1365795.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 12,
          image: "https://images.pexels.com/photos/442574/pexels-photo-442574.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 13,
          image: "https://images.pexels.com/photos/1298601/pexels-photo-1298601.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 14,
          image: "https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 15,
          image: "https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 16,
          image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        }
      ]
    },
    {
      id: 'electronics',
      title: 'Top picks in Electronics',
      linkText: 'See all',
      products: [
        {
          id: 17,
          image: "./display/display1.jpg"
        },
        {
          id: 18,
          image: "./display/display2.jpg"
        },
        {
          id: 19,
          image: "./display/display3.jpg"
        },
        {
          id: 20,
          image: "./display/display4.jpg"
        },
        {
          id: 21,
          image: "./display/display5.jpg"
        },
        {
          id: 22,
          image: "./display/display6.jpg"
        },
        {
          id: 23,
          image: "./display/display7.jpg"
        },
        {
          id: 24,
          image: "./display/display8.jpg"
        }
      ]
    },
    {
      id: 'home',
      title: 'Home & Kitchen Essentials',
      linkText: 'Discover more',
      products: [
        {
          id: 25,
          image: "https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 26,
          image: "https://images.pexels.com/photos/586958/pexels-photo-586958.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 27,
          image: "https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 28,
          image: "https://images.pexels.com/photos/4440449/pexels-photo-4440449.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 29,
          image: "https://images.pexels.com/photos/4790566/pexels-photo-4790566.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 30,
          image: "https://images.pexels.com/photos/3738352/pexels-photo-3738352.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 31,
          image: "https://images.pexels.com/photos/3685530/pexels-photo-3685530.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        },
        {
          id: 32,
          image: "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop"
        }
      ]
    }
  ];

  const scrollContainer = (sectionId, direction) => {
    const container = document.getElementById(`scroll-${sectionId}`);
    if (container) {
      const scrollAmount = 320; // Width of one product + gap
      const currentScroll = container.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      container.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  const ProductSection = ({ section }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
            {section.title}
          </h2>
          <Link 
            to={`/category-group/${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
            className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:text-blue-700 transition-colors">
            {section.linkText || 'See all'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Products Container - Responsive */}
        <div className="relative">
          {/* Only show arrows on desktop */}
          {section.products.length > 4 && (
            <button
              onClick={() => scrollContainer(section.id, 'left')}
              className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {section.products.length > 4 && (
            <button
              onClick={() => scrollContainer(section.id, 'right')}
              className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Responsive Products Grid/Scroll */}
          <div
            id={`scroll-${section.id}`}
            className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:gap-4 lg:overflow-x-auto lg:scrollbar-hide lg:scroll-smooth gap-3 sm:gap-4 lg:pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {section.products.slice(0, window.innerWidth < 1024 ? 6 : section.products.length).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="lg:flex-shrink-0 lg:w-72 cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-lg">
                  <LazyImage
                    src={getImageUrl('products', product.image)}
                    alt={product.title || `Product ${product.id}`}
                    className="w-full h-32 sm:h-48 lg:h-72 object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = '/uploads/products/placeholder-image.jpg';
                    }}
                  />
                  {/* Optional hover overlay */}
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span>Curated Collections</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Discover Amazing
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Products</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our handpicked selection of top-rated products across all categories
          </p>
        </div>

        {/* Product Sections */}
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading product sections...</p>
            </div>
          ) : productSections.length > 0 ? (
            productSections.map((section) => (
              <ProductSection 
                key={section._id || section.id} 
                section={section} 
              />
            ))
          ) : (
            initialSections.map((section) => (
              <ProductSection key={section.id} section={section} />
            ))
          )}
        </div>
      </div>

      {/* Custom CSS to hide scrollbars */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default AmazonStyleProductDisplay;