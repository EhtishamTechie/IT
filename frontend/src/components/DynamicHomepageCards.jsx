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
      const response = await API.get('/homepage/cards');
      const data = response.data.cards || [];
      console.log('Homepage cards received:', data.length);
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
    <div className="w-full bg-white py-1 sm:py-2">
      <div className="w-full px-3 sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          {cardPositions.map((card, index) => {
            // Default placeholder card if no card is configured
            if (!card) {
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-1.5 flex items-center justify-center h-24 sm:h-28 text-gray-400">
                    <div className="text-center">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full mx-auto mb-1"></div>
                      <p className="text-[10px] sm:text-xs">Card not configured</p>
                    </div>
                  </div>
                </div>
              );
            }

            // Main category card (single image)
            if (card.type === 'main-category') {
              return (
                <div key={card._id} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 leading-tight">
                      {card.title}
                    </h3>
                    {card.mainImage && (
                      <Link to={getCategoryUrl(card.mainCategory?._id, card.mainCategory?.name)}>
                        <img 
                          src={getCardImageUrl(card)}
                          alt={card.title}
                          loading={card.order === 1 ? "eager" : "lazy"}
                          fetchpriority={card.order === 1 ? "high" : "auto"}
                          decoding="async"
                          className="w-full aspect-square object-cover rounded-sm mb-1 hover:opacity-90 transition-opacity cursor-pointer"
                          onError={(e) => {
                            e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="16" fill="%23475569">${card.title}</text></svg>`;
                          }}
                        />
                      </Link>
                    )}
                  </div>
                </div>
              );
            }

            // Subcategories card (4 images)
            if (card.type === 'subcategories' && card.subcategoryItems?.length === 4) {
              return (
                <div key={card._id} className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 leading-tight">
                      {card.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-0.5 mb-1">
                      {card.subcategoryItems.map((item, idx) => (
                        <div key={idx} className="text-center">
                          <Link to={getCategoryUrl(item.category._id, item.category.name)}>
                            <img 
                              src={getSubcategoryImageUrl(item)}
                              alt={item.name}
                              loading={card.order === 1 ? "eager" : "lazy"}
                              fetchpriority={card.order === 1 && idx < 2 ? "high" : "auto"}
                              decoding="async"
                              className="w-full aspect-square object-cover rounded-sm mb-0.5 hover:opacity-80 transition-opacity"
                              onError={(e) => {
                                e.target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23f8fafc"/><text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="10" fill="%23475569">${item.name}</text></svg>`;
                              }}
                            />
                          </Link>
                          <p className="text-[10px] font-medium text-gray-700">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
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
