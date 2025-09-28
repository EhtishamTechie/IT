import React from 'react';

const ImagePlaceholder = ({ size = 'normal', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    normal: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const iconSizes = {
    small: '12',
    normal: '24',
    large: '32'
  };

  return (
    <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
      <div className="text-center text-gray-400">
        <div className={`mx-auto mb-1 bg-gray-200 rounded-lg flex items-center justify-center ${sizeClasses[size]}`}>
          <svg 
            width={iconSizes[size]} 
            height={iconSizes[size]} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" 
              fill="currentColor"
            />
          </svg>
        </div>
        {size !== 'small' && <p className="text-xs">Image unavailable</p>}
      </div>
    </div>
  );
};

export default ImagePlaceholder;