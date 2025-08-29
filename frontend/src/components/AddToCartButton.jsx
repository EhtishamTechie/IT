import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';

const AddToCartButton = ({ 
  product, 
  quantity = 1, 
  variant = 'primary', 
  size = 'md', 
  showQuantitySelector = false,
  className = '',
  disabled = false,
  children 
}) => {
  const [selectedQuantity, setSelectedQuantity] = useState(quantity);
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart, isInCart, getCartItem } = useCart();

  const cartItem = getCartItem(product._id);
  const inCart = isInCart(product._id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product, selectedQuantity);
      
      // Optional: Show success feedback
      const event = new CustomEvent('cartUpdated', {
        detail: { action: 'add', product, quantity: selectedQuantity }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Variant styles
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed'
  };

  // Size styles
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl'
  };

  const buttonClasses = `
    ${variants[disabled ? 'disabled' : variant]} 
    ${sizes[size]} 
    ${className}
    font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-2
    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    ${isAdding ? 'opacity-75' : ''}
  `.trim();

  const buttonContent = children || (
    <>
      {isAdding ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Adding...</span>
        </>
      ) : inCart ? (
        <>
          <CheckIcon className="w-4 h-4" />
          <span>In Cart ({cartItem?.quantity})</span>
        </>
      ) : (
        <>
          <CartIcon className="w-4 h-4" />
          <span>Add to Cart</span>
        </>
      )}
    </>
  );

  return (
    <div className="flex flex-col space-y-2">
      {showQuantitySelector && (
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Qty:</label>
          <select
            value={selectedQuantity}
            onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <button
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
        className={buttonClasses}
        aria-label={`Add ${product.title} to cart`}
      >
        {buttonContent}
      </button>
    </div>
  );
};

// Icons
const CartIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.1 5.5M7 13v6a2 2 0 002 2h4a2 2 0 002-2v-6m-6 0h6" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

export default AddToCartButton;
