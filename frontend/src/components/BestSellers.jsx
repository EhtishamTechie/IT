import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { getApiUrl, getImageUrl } from '../config';
import { toast } from 'react-toastify';

const CACHE_DURATION = 30000; // 30 seconds

const ProductCard = ({ product }) => (
  <div className="group relative overflow-hidden rounded-lg shadow hover:shadow-lg transition-all duration-300">
    <div className="aspect-square w-full overflow-hidden">
      <img
        src={getImageUrl('products', product.image)}
        alt={product.name}
        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/placeholder-product.jpg';
        }}
      />
    </div>
    <div className="p-3 sm:p-4 bg-white">
      <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
      <p className="mt-1 text-base sm:text-lg font-semibold text-gray-900">${product.price.toFixed(2)}</p>
      <div className="mt-2">
        <Link
          to={`/product/${product._id}`}
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  </div>
);

const BestSellers = () => {
  const [categoryProducts, setCategoryProducts] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Cache
  const cache = useRef({
    categoryProducts: { data: null, timestamp: 0 }
  });

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      const now = Date.now();
      if (cache.current.categoryProducts.data && now - cache.current.categoryProducts.timestamp < CACHE_DURATION) {
        console.log('Using cached best sellers data');
        setCategoryProducts(cache.current.categoryProducts.data);
        setLoading(false);
        return;
      }

      console.log('Fetching fresh best sellers data');
      try {
        // Fetch static categories that we set up in admin
        const response = await API.get(getApiUrl('homepage/static-categories'));
        const staticCategories = response.data.categories;

        // Transform the data into the format we need
        const productsMap = {};
        staticCategories.forEach(category => {
          productsMap[category.category._id] = {
            name: category.category.name,
            products: category.selectedProducts || []
          };
        });

        setCategoryProducts(productsMap);
        
        // Update cache
        cache.current.categoryProducts = {
          data: productsMap,
          timestamp: now
        };
      } catch (err) {
        console.error('Error fetching homepage categories:', err);
        toast.error('Failed to load best sellers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, []);

  if (loading) {
    return (
      <div className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 w-1/3 bg-gray-200 rounded mb-6 sm:mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-56 sm:h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 sm:space-y-12">
          {Object.entries(categoryProducts).map(([categoryId, { name, products }]) => (
            <div key={categoryId}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Best Sellers in {name}</h2>
                <Link
                  to={`/category-group/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="text-sm sm:text-base text-blue-600 hover:text-blue-800 font-medium"
                >
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.slice(0, 4).map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BestSellers;
