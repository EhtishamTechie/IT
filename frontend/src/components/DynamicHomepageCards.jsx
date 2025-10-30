import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../api';
import { getImageUrl, getApiUrl } from '../config';

const CACHE_DURATION = 30000; // 30 seconds

const DynamicHomepageCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cache
  const cache = useRef({
    cards: { data: null, timestamp: 0 }
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const now = Date.now();
    if (cache.current.cards.data && now - cache.current.cards.timestamp < CACHE_DURATION) {
      console.log('Using cached homepage cards data');
      setCards(cache.current.cards.data);
      setLoading(false);
      return;
    }

    console.log('Fetching fresh homepage cards data');
    try {
      const response = await API.get(getApiUrl('homepage/cards'));
      const data = response.data.cards || [];
      setCards(data);
      
      // Update cache
      cache.current.cards = {
        data: data,
        timestamp: now
      };
    } catch (err) {
      console.error('Error fetching homepage cards:', err);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const getCardImageUrl = (card) => {
    if (card.type === 'main-category' && card.mainImage) {
      return getImageUrl('homepage-cards', card.mainImage);
    }
    return null;
  };

  const getSubcategoryImageUrl = (subcategoryItem) => {
    if (subcategoryItem?.image) {
      return getImageUrl('homepage-cards', subcategoryItem.image);
    }
    return null;
  };

  const getCategoryUrl = (categoryId, categoryName) => {
    if (!categoryName) return '/products';
    return `/category-group/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
  };

  if (loading) {
    return (
      <div className="bg-white py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="bg-gray-200 animate-pulse rounded-lg h-56 sm:h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Create array for all 4 positions
  const cardPositions = [1, 2, 3, 4].map(position => 
    cards.find(card => card.order === position) || null
  );

  return (
    <div className="bg-white py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cardPositions.map((card, index) => {
            // Default placeholder card if no card is configured
            if (!card) {
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-4 sm:p-5 flex items-center justify-center h-56 sm:h-64 text-gray-400">
                    <div className="text-center">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                      <p className="text-xs sm:text-sm">Card not configured</p>
                    </div>
                  </div>
                </div>
              );
            }

            // Main category card (single image)
            if (card.type === 'main-category') {
              return (
                <div key={card._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                      {card.title}
                    </h3>
                    {card.mainImage && (
                      <img 
                        src={getCardImageUrl(card)}
                        alt={card.title}
                        loading="lazy"
                        className="w-full h-32 sm:h-40 object-cover rounded-md mb-3 sm:mb-4"
                        onError={(e) => {
                          e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%23475569">${card.title}</text></svg>`;
                        }}
                      />
                    )}
                    <p className="text-xs sm:text-sm text-gray-700 font-medium mb-2">
                      {card.mainCategory?.name}
                    </p>
                    <Link 
                      to={getCategoryUrl(card.mainCategory?._id, card.mainCategory?.name)}
                      className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {card.linkText}
                    </Link>
                  </div>
                </div>
              );
            }

            // Subcategories card (4 images)
            if (card.type === 'subcategories' && card.subcategoryItems?.length === 4) {
              return (
                <div key={card._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                      {card.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      {card.subcategoryItems.map((item, idx) => (
                        <div key={idx} className="text-center">
                          <Link to={getCategoryUrl(item.category._id, item.category.name)}>
                            <img 
                              src={getSubcategoryImageUrl(item)}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-16 sm:h-20 object-cover rounded-sm mb-1 sm:mb-2 hover:opacity-80 transition-opacity"
                              onError={(e) => {
                                e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="10" fill="%23475569">${item.name}</text></svg>`;
                              }}
                            />
                          </Link>
                          <p className="text-xs font-medium text-gray-700">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Link 
                      to={getCategoryUrl(card.mainCategory?._id, card.mainCategory?.name)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      {card.linkText}
                    </Link>
                  </div>
                </div>
              );
            }

            // Fallback for invalid cards
            return (
              <div key={card._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-5 flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <p className="text-sm">Invalid card configuration</p>
                    <p className="text-xs text-gray-500 mt-1">{card.title}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DynamicHomepageCards;
