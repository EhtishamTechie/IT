const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { getUploadUrl } = require('../utils/urlHelpers');

// Mock cart storage for when MongoDB is not available
const mockCarts = new Map();

// Helper function to normalize image URLs
const normalizeImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL (http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Clean up the path
  let cleanPath = imageUrl
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/([^:])\/+/g, '$1/') // Fix double slashes
    .replace(/products\/products\//, 'products/'); // Fix duplicate products folder
  
  // Extract filename from path for proper URL construction
  let filename = cleanPath;
  if (cleanPath.includes('/')) {
    filename = cleanPath.split('/').pop(); // Get just the filename
  }
  
  console.log('🔧 normalizeImageUrl processing:', {
    input: imageUrl,
    cleanPath: cleanPath,
    filename: filename
  });
  
  // Use getUploadUrl with proper parameters (type, filename)
  return getUploadUrl('products', filename);
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    // Since authentication is required by middleware, req.user will always exist
    const userId = req.user.userId || req.user.id; // Handle both userId and id from JWT

    try {
      let cart = await Cart.findOne({ user: userId }).populate('items.product').populate('items.productData.vendor', 'businessName email contactPhone');
      
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
        await cart.save();
      }

      // Update stock information for each cart item to ensure current data
      for (let item of cart.items) {
        if (item.productData && item.productData._id) {
          // Try to get current product from MongoDB only
          let currentProduct = await Product.findById(item.productData._id);
          
          // Update stock information if product found
          if (currentProduct) {
            item.productData.stock = currentProduct.stock || 0;
            item.productData.inStock = currentProduct.stock > 0;
            item.productData.shipping = currentProduct.shipping || 0;
            console.log('📦 Updated cart item with shipping:', {
              productId: item.productData._id,
              title: item.productData.title,
              currentProductShipping: currentProduct.shipping,
              updatedShipping: item.productData.shipping
            });
          }
          
          // Keep raw image filename - let frontend handle URL construction with getImageUrl
          console.log('🖼️ Cart item image data:', {
            productId: item.productData._id,
            title: item.productData.title,
            rawImage: item.productData.image,
            hasImage: !!item.productData.image
          });
        }
      }

      // Save cart with updated stock information
      await cart.save();

      return res.json({
        success: true,
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalAmount: cart.totalAmount,
          currency: cart.currency
        }
      });
    } catch (mongoError) {
      console.error('Database error:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve cart'
      });
    }

  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving cart'
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    // Since authentication is required by middleware, req.user will always exist
    const userId = req.user.userId || req.user.id; // Handle both userId and id from JWT
    const { productId, quantity = 1 } = req.body;

    console.log('Add to cart request:', { userId, productId, quantity });

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    try {
      // Find or create cart
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }

      // Get product details - try database first, then mock data
      let product;
      try {
        product = await Product.findById(productId).populate('vendor', 'businessName email contactPhone');
        console.log('Found product in DB:', product?.title);
        console.log('Product vendor:', product?.vendor);
        console.log('Product category:', product?.category, 'Type:', typeof product?.category);
      } catch (productError) {
        console.log('Product not found in DB, checking mock data...');
        product = null;
      }

      // Product not found in MongoDB
      if (!product) {
        console.log('Product not found:', productId);
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check stock availability
      if (product.stock !== undefined && product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`
        });
      }

      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productData._id === productId
      );

      if (existingItemIndex > -1) {
        // Update existing item quantity
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Check stock for updated quantity
        if (product.stock !== undefined && product.stock < newQuantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} items available in stock`
          });
        }
        
        // Update existing item data
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].productData = {
          ...cart.items[existingItemIndex].productData,
          stock: product.stock || 0,
          inStock: product.stock > 0,
          shipping: product.shipping || 0,
          images: product.images || [],
          image: product.images?.[0] || product.image || 'placeholder-image.jpg'
        };
      } else {
        // Add new item to cart
        let categoryValue = product.category;
        if (Array.isArray(categoryValue)) {
          categoryValue = categoryValue[0];
        } else if (!categoryValue) {
          // Fallback to subCategory, but handle if it's also an array
          categoryValue = product.subCategory;
          if (Array.isArray(categoryValue)) {
            categoryValue = categoryValue[0];
          }
        }
        
        console.log('Category processing:', {
          original: product.category,
          subCategory: product.subCategory,
          isArray: Array.isArray(product.category),
          final: categoryValue
        });
        
        cart.items.push({
          product: product._id,
          productData: {
            _id: product._id,
            title: product.title,
            price: product.price,
            image: product.images?.[0] || product.image || 'placeholder-image.jpg',
            currency: product.currency || 'USD',
            stock: product.stock || 0,
            brand: product.brand,
            category: categoryValue || 'Uncategorized',
            // CRITICAL: Add vendor and handling information
            vendor: product.vendor || null,
            handledBy: product.vendor ? 'vendor' : 'admin',
            assignedVendor: product.vendor || null,
            // Add additional required fields for order processing
            weight: product.weight || null,
            dimensions: product.dimensions || null,
            shipping: product.shipping || 0,
            sku: product.sku || null,
            vendorSku: product.vendorSku || null
          },
          quantity,
          price: product.price
        });
        
        console.log('🖼️ Added cart item with images:', {
          productId: product._id,
          title: product.title,
          images: product.images || [],
          firstImage: product.images?.[0] || product.image
        });
      }

      await cart.save();

      return res.json({
        success: true,
        message: 'Item added to cart',
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalAmount: cart.totalAmount,
          currency: cart.currency
        }
      });

    } catch (mongoError) {
      console.error('Database error:', mongoError);
      return res.status(500).json({
        success: false,
        message: 'Failed to add item to cart'
      });
    }

  } catch (error) {
    console.error('Cart add error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update item quantity in cart
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id; // Handle both userId and id from JWT
    const { productId, quantity } = req.body;

    if (!productId || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and valid quantity are required'
      });
    }

    // Try MongoDB first
    try {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      if (quantity === 0) {
        // Remove item
        cart.items = cart.items.filter(item => item.productData._id !== productId);
      } else {
        // Update quantity - validate against stock first
        const itemIndex = cart.items.findIndex(item => item.productData._id === productId);
        if (itemIndex > -1) {
          // Get product to check stock from MongoDB only
          let product = await Product.findById(productId);
          
          if (!product) {
            return res.status(404).json({
              success: false,
              message: 'Product not found'
            });
          }

          // Check stock availability
          if (product && product.stock !== undefined && product.stock < quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock. Only ${product.stock} items available.`,
              availableStock: product.stock
            });
          }

          cart.items[itemIndex].quantity = quantity;
        } else {
          return res.status(404).json({
            success: false,
            message: 'Item not found in cart'
          });
        }
      }

      await cart.save();

      res.json({
        success: true,
        message: 'Cart updated',
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalAmount: cart.totalAmount,
          currency: cart.currency
        }
      });

    } catch (mongoError) {
      // Fallback to mock data
      console.log('MongoDB not available, using mock cart data');
      
      let cart = mockCarts.get(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      if (quantity === 0) {
        cart.items = cart.items.filter(item => item.productData._id !== productId);
      } else {
        const itemIndex = cart.items.findIndex(item => item.productData._id === productId);
        if (itemIndex > -1) {
          cart.items[itemIndex].quantity = quantity;
        } else {
          return res.status(404).json({
            success: false,
            message: 'Item not found in cart'
          });
        }
      }

      // Update totals
      cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
      cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

      mockCarts.set(userId, cart);

      res.json({
        success: true,
        message: 'Cart updated',
        cart
      });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id; // Handle both userId and id from JWT
    const { productId } = req.params;

    // Try MongoDB first
    try {
      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      cart.items = cart.items.filter(item => item.productData._id !== productId);
      await cart.save();

      res.json({
        success: true,
        message: 'Item removed from cart',
        cart: {
          items: cart.items,
          totalItems: cart.totalItems,
          totalAmount: cart.totalAmount,
          currency: cart.currency
        }
      });

    } catch (mongoError) {
      // Fallback to mock data
      console.log('MongoDB not available, using mock cart data');
      
      let cart = mockCarts.get(userId);
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      cart.items = cart.items.filter(item => item.productData._id !== productId);
      
      // Update totals
      cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
      cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);

      mockCarts.set(userId, cart);

      res.json({
        success: true,
        message: 'Item removed from cart',
        cart
      });
    }
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id; // Handle both userId and id from JWT

    // Try MongoDB first
    try {
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      } else {
        cart.items = [];
      }
      
      await cart.save();

      res.json({
        success: true,
        message: 'Cart cleared',
        cart: {
          items: [],
          totalItems: 0,
          totalAmount: 0,
          currency: 'USD'
        }
      });

    } catch (mongoError) {
      // Fallback to mock data
      console.log('MongoDB not available, using mock cart data');
      
      const cart = {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        currency: 'USD'
      };

      mockCarts.set(userId, cart);

      res.json({
        success: true,
        message: 'Cart cleared',
        cart
      });
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
