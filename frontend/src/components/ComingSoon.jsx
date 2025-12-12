import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Clock, ArrowLeft } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated Icon */}
        <div className="mb-8 relative">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg animate-pulse">
            <Rocket className="text-4xl text-white transform rotate-45" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Clock className="text-yellow-800 text-sm" />
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Coming Soon!
        </h1>
        
        <p className="text-lg text-gray-600 mb-2">
          We're working hard to bring you this amazing feature.
        </p>
        
        <p className="text-sm text-gray-500 mb-8">
          Stay tuned for something incredible!
        </p>

        {/* Progress Bar Animation */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"
            style={{ width: '75%' }}
          ></div>
        </div>

        {/* Back Button */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <ArrowLeft className="text-sm" />
          Back to Home
        </Link>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-white/50 rounded-lg backdrop-blur-sm border border-white/20">
          <p className="text-sm text-gray-600">
            Want to be notified when we launch? 
            <br />
            <span className="font-semibold text-blue-600">Follow us on social media!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;