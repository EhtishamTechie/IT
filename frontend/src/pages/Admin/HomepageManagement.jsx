import React, { useState } from 'react';
import { Tabs, Tab } from '@headlessui/react';
import BannerManagement from '../../components/admin/homepage/BannerManagement';
import CardManagement from '../../components/admin/homepage/CardManagement';
import CategoryManagement from '../../components/admin/homepage/CategoryManagement';
import PremiumProducts from '../../components/admin/homepage/PremiumProducts';
import FeaturedProducts from '../../components/admin/homepage/FeaturedProducts';
import PageHeader from '../../components/admin/PageHeader';

const HomepageManagement = () => {
  const tabs = [
    { name: 'Banner Settings', component: BannerManagement },
    { name: 'Cards Settings', component: CardManagement },
    { name: 'Categories Settings', component: CategoryManagement },
    { name: 'Premium Products', component: PremiumProducts },
    { name: 'Featured Products', component: FeaturedProducts }
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-9xl mx-auto">
      <PageHeader 
        title="Homepage Management" 
        description="Manage all sections of your homepage from here"
      />
      
      <div className="bg-white shadow-lg rounded-lg mt-8">
        <Tabs as="div" className="w-full">
          <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-t-lg">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full py-3 px-4 text-sm font-medium leading-5 rounded-lg
                  ${
                    selected
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/[0.12]'
                  }
                  `
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="p-4">
            {tabs.map((tab, idx) => (
              <Tab.Panel key={idx}>
                <tab.component />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tabs>
      </div>
    </div>
  );
};

export default HomepageManagement;
