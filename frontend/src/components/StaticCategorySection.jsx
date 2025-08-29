import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { getApiUrl, getImageUrl } from '../config';

const StaticCategorySection = () => {
  const [staticCategories, setStaticCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaticCategories = async () => {
      try {
        setLoading(true);
        const response = await API.get(getApiUrl('homepage/static-categories'));
        if (response.data.success) {
          setStaticCategories(response.data.categories);
        }
      } catch (err) {
        console.error('Error fetching static categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchStaticCategories();
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-64"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return null; // Hide section if there's an error
  }

  if (staticCategories.length === 0) {
    return null; // Hide section if no static categories
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Categories
          </h2>
          <p className="text-lg text-gray-600">
            Explore our handpicked selection of products from top categories
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {staticCategories.map((category) => (
            <div 
              key={category._id} 
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              {/* Category Header */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <span>{category.category.name}</span>
                  <Link 
                    to={`/category-group/${category.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    See all
                  </Link>
                </h3>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 gap-2 p-2">
                {category.selectedProducts.slice(0, 4).map((product) => (
                  <Link 
                    key={product._id}
                    to={`/product/${product._id}`}
                    className="relative block aspect-square rounded overflow-hidden group"
                  >
                    <img
                      src={getImageUrl('products', product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-product.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300" />
                  </Link>
                ))}
              </div>

              {/* View All Link */}
              <div className="p-4 bg-gray-50">
                <Link
                  to={`/category-group/${category.category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-between"
                >
                  View All Products
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StaticCategorySection;
