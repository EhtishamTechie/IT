import React from 'react';

const SmartPagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  maxVisible = 5,
  className = "",
  showInfo = false,
  totalItems = 0,
  itemsPerPage = 10,
  itemName = "items"
}) => {
  if (totalPages <= 1) return null;

  const renderPageButtons = () => {
    const pages = [];
    
    if (totalPages <= 5) {
      // Show all pages if total pages is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`px-3 py-2 text-sm font-medium border transition-colors ${
              currentPage === i
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      // For more than 5 pages, use ellipsis logic
      if (currentPage <= 3) {
        // Show first 3 pages, ellipsis, then last page
        for (let i = 1; i <= 3; i++) {
          pages.push(
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`px-3 py-2 text-sm font-medium border transition-colors ${
                currentPage === i
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {i}
            </button>
          );
        }
        
        if (totalPages > 4) {
          pages.push(
            <span key="right-ellipsis" className="px-3 py-2 text-sm text-gray-400">
              ...
            </span>
          );
          
          pages.push(
            <button
              key={totalPages}
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          );
        }
      } else if (currentPage >= totalPages - 2) {
        // Show first page, ellipsis, then last 3 pages
        pages.push(
          <button
            key={1}
            onClick={() => onPageChange(1)}
            className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
          >
            1
          </button>
        );
        
        pages.push(
          <span key="left-ellipsis" className="px-3 py-2 text-sm text-gray-400">
            ...
          </span>
        );
        
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`px-3 py-2 text-sm font-medium border transition-colors ${
                currentPage === i
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {i}
            </button>
          );
        }
      } else {
        // Show first page, ellipsis, current page, ellipsis, last page
        pages.push(
          <button
            key={1}
            onClick={() => onPageChange(1)}
            className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
          >
            1
          </button>
        );
        
        pages.push(
          <span key="left-ellipsis" className="px-3 py-2 text-sm text-gray-400">
            ...
          </span>
        );
        
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(
            <button
              key={i}
              onClick={() => onPageChange(i)}
              className={`px-3 py-2 text-sm font-medium border transition-colors ${
                currentPage === i
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {i}
            </button>
          );
        }
        
        pages.push(
          <span key="right-ellipsis" className="px-3 py-2 text-sm text-gray-400">
            ...
          </span>
        );
        
        pages.push(
          <button
            key={totalPages}
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 text-sm font-medium border transition-colors bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
          >
            {totalPages}
          </button>
        );
      }
    }

    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg border-t border-gray-200 ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-700 mb-2 sm:mb-0">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} {itemName}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-1">
          {renderPageButtons()}
        </div>

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SmartPagination;
