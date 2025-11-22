import React from 'react';

const ProductInfo = ({ 
  product, 
  discountedPrice, 
  quantity,
  selectedSize,
  setSelectedSize,
  handleQuantityDecrease, 
  handleQuantityChange, 
  handleQuantityIncrease, 
  handleAddToCart, 
  handleBuyNow, 
  isAddingToCart, 
  extractCategoryNames 
}) => {
  
  return (
    <div className="w-full space-y-6">
      {/* Product Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" itemProp="name">
          {product?.seo?.title || product?.metaTitle || product?.title || 'Product'}
        </h1>
      </div>

      {/* Price */}
      <div>
        <span className="text-3xl lg:text-4xl font-bold text-orange-600">
          PKR {(discountedPrice || 0).toFixed(2)}
        </span>
        {product && product.discount > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg text-gray-500 line-through">
              PKR {(product.price || 0).toFixed(2)}
            </span>
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {product.discount}% OFF
            </span>
          </div>
        )}
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          product && product.stock > 0 ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className={`font-medium ${
          product && product.stock > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {product && product.stock > 0 ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Description</h3>
        <p className="text-gray-600 leading-relaxed text-justify">
          {product?.description || 'No description available'}
        </p>
      </div>

      {/* Categories */}
      {(() => {
        const mainCategories = extractCategoryNames(product?.mainCategory);
        const subCategories = extractCategoryNames(product?.subCategory);
        const categories = extractCategoryNames(product?.category);
        const hasAnyCategories = mainCategories.length > 0 || subCategories.length > 0 || categories.length > 0;
        
        return hasAnyCategories && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {mainCategories.map((catName, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {catName}
                </span>
              ))}
              {subCategories.map((catName, index) => (
                <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  {catName}
                </span>
              ))}
              {categories.map((catName, index) => (
                <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                  {catName}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Vendor Information */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Sold by</h3>
        <span className="text-orange-600 font-semibold text-lg">
          {product?.vendor && typeof product.vendor === 'object' && product.vendor.businessName
            ? product.vendor.businessName
            : product?.vendor?.name || 'International Tijarat'}
        </span>
      </div>

      {/* Size Selection - Conditional - Only show sizes with stock > 0 */}
      {product?.hasSizes && product?.availableSizes && product.availableSizes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Select Size</h3>
          <div className="flex flex-wrap gap-2">
            {product.availableSizes.filter(size => {
              const stock = product.sizeStock?.[size] || 0;
              return stock > 0;
            }).map((size) => {
              const stock = product.sizeStock?.[size] || 0;
              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border-2 rounded-lg font-medium transition-all relative ${
                    selectedSize === size
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  <div>{size}</div>
                  <div className={`text-xs mt-1 ${selectedSize === size ? 'text-orange-100' : 'text-gray-500'}`}>
                    Stock: {stock}
                  </div>
                </button>
              );
            })}
          </div>
          {product.availableSizes.filter(size => (product.sizeStock?.[size] || 0) > 0).length === 0 && (
            <p className="text-sm text-red-500 mt-2">All sizes are out of stock</p>
          )}
          {!selectedSize && product.availableSizes.filter(size => (product.sizeStock?.[size] || 0) > 0).length > 0 && (
            <p className="text-sm text-red-500 mt-2">Please select a size</p>
          )}
        </div>
      )}

      {/* Quantity and Action Buttons */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-lg font-semibold">Quantity:</label>
          <div className="flex items-center border-2 border-gray-300 rounded-lg">
            <button
              onClick={handleQuantityDecrease}
              className="px-3 py-2 text-xl font-bold hover:bg-gray-100 transition-colors"
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={handleQuantityChange}
              className="w-16 py-2 text-center border-0 focus:ring-0 text-lg font-semibold"
              min="1"
              max={product?.stock || 999}
            />
            <button
              onClick={handleQuantityIncrease}
              className={`px-3 py-2 text-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                (product?.stock || 0) === 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : quantity >= (product?.stock || 0)
                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  : 'hover:bg-gray-100'
            }`}
              disabled={(product?.stock || 0) === 0}
            >
              +
            </button>
          </div>
        </div>

        {/* Stock availability indicator */}
        {product?.stock !== undefined && (
          <div className="text-sm text-gray-600">
            {product.stock > 0 ? (
              <span>
                <strong>{product.stock}</strong> items available
              </span>
            ) : (
              <span className="text-red-600 font-medium">Out of stock</span>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            disabled={(product?.stock || 0) === 0 || isAddingToCart}
            className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
              (product?.stock || 0) === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {isAddingToCart ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              </div>
            ) : (product?.stock || 0) === 0 ? (
              'Out of Stock'
            ) : (
              'Add to Cart'
            )}
          </button>
          
          <button
            onClick={handleBuyNow}
            disabled={(product?.stock || 0) === 0}
            className={`flex-1 py-3 rounded-lg font-bold text-lg transition-colors ${
              (product?.stock || 0) === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {(product?.stock || 0) === 0 ? 'Out of Stock' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInfo;