import React, { useState } from 'react';
import {
  BannerManagement,
  CardManagement,
  CategorySettings,
  StaticCategoryManagement,
  FeaturedProductsManager,
  PremiumProductsManager
} from '../../../components/admin/homepage';

const HomepageManagement = () => {
  const [activeTab, setActiveTab] = useState('banner');

  const tabs = [
    { id: 'banner', label: 'Banner Management' },
    { id: 'cards', label: 'Card Management' },
    { id: 'categories', label: 'Category Settings' },
    { id: 'static-categories', label: 'Static Category Cards' },
    { id: 'premium', label: 'Premium Products' },
    { id: 'featured', label: 'Featured Products' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'banner':
        return <BannerManagement />;
      case 'cards':
        return <CardManagement />;
      case 'categories':
        return <CategorySettings />;
      case 'premium':
        return <PremiumProductsManager />;
      case 'featured':
        return <FeaturedProductsManager />;
      case 'static-categories':
        return <StaticCategoryManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Homepage Management</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default HomepageManagement;
