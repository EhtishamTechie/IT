import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import {
    Box,
    Typography,
    Button,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    CircularProgress,
    TextField,
    InputAdornment,
    IconButton,
    Modal,
    Tabs,
    Tab,
    Paper,
    Grid,
    Pagination
} from '@mui/material';

import { Eye, Search, Trash2, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api';
import { config, getImageUrl } from '../../../config';
import CategorySelector from './CategorySelector';
import BannerPreview from './BannerPreview';

const CACHE_DURATION = 30000; // 30 seconds
const PAGE_SIZE = 12;

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '95%',
    maxWidth: '1400px',
    height: '90vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    '&:focus': {
        outline: 'none',
    }
};

// Helper function to get product image URL using configuration system
const getProductImage = (product) => {
    if (!product) return null;
    
    // Try different image fields in order of preference
    if (Array.isArray(product.images) && product.images.length > 0) {
        const image = product.image || product.images[0];
        return typeof image === 'string' ? getImageUrl('products', image) : null;
    }
    
    if (product.image) {
        return typeof product.image === 'string' ? getImageUrl('products', product.image) : null;
    }
    
    // If product has imagePath directly
    if (product.imagePath) {
        return getImageUrl('products', product.imagePath);
    }
    
    return null;
};

const BannerManagement = () => {
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Current slide editing
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPrimaryProduct, setSelectedPrimaryProduct] = useState(null);
    const [selectedSecondaryProducts, setSelectedSecondaryProducts] = useState([]);
    
    // Product selection
    const [showProductSelection, setShowProductSelection] = useState(false);
    const [selectionMode, setSelectionMode] = useState('primary'); // 'primary' or 'secondary'
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    // Cache and loading states
    const cache = useRef({
        bannerData: { data: null, timestamp: 0 },
        categoryProducts: { data: null, timestamp: 0, category: null, page: null, searchTerm: null }
    });
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((term) => {
            if (!term.trim()) {
                setFilteredProducts(categoryProducts);
                return;
            }
            const filtered = categoryProducts.filter(product => 
                product.title.toLowerCase().includes(term.toLowerCase()) ||
                product.description?.toLowerCase().includes(term.toLowerCase())
            );
            setFilteredProducts(filtered);
        }, 300),
        [categoryProducts]
    );
    
    // Preview mode
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        fetchBannerData();
    }, []);

    useEffect(() => {
        if (selectedCategory && selectedCategory._id) {
            fetchCategoryProducts(page);
        }
    }, [selectedCategory, page]);

    // Add effect to preserve selected products when switching slides
    useEffect(() => {
        if (slides[currentSlide]) {
            loadSlideData(slides[currentSlide], currentSlide);
        }
    }, [currentSlide]);

    const fetchBannerData = async () => {
        // Check cache
        const now = Date.now();
        if (cache.current.bannerData.data && now - cache.current.bannerData.timestamp < CACHE_DURATION) {
            setSlides(cache.current.bannerData.data);
            if (cache.current.bannerData.data.length > 0) {
                loadSlideData(cache.current.bannerData.data[0], 0);
            }
            setLoading(false);
            return;
        }

        try {
            console.log('Fetching banner data...');
            const response = await API.get('/homepage/banners');
            console.log('Banner response:', response.data);
            
            // Normalize the data structure
    const normalizeSlide = (slide) => {
        if (!slide) return null;
        console.log('🔄 Normalizing slide:', slide);
        console.log('🖼️ Slide image data:', {
            primaryProduct: slide.primaryProduct,
            primaryProductImage: slide.primaryProductImage,
            primaryProductImages: slide.primaryProductImages,
            secondaryProducts: slide.secondaryProducts
        });
        
        // Handle category
        const category = slide.category ? 
            (typeof slide.category === 'string' ? { _id: slide.category, name: slide.categoryName } : slide.category) : 
            null;
        
        // Handle primary product
        const primaryProduct = slide.primaryProduct ? 
            (typeof slide.primaryProduct === 'string' ? 
                { 
                    _id: slide.primaryProduct,
                    title: slide.primaryProductTitle || 'Primary Product',
                    price: slide.primaryProductPrice,
                    images: Array.isArray(slide.primaryProductImages) ? slide.primaryProductImages : [],
                    image: slide.primaryProductImage || slide.image
                } 
                : {
                    ...slide.primaryProduct,
                    title: slide.primaryProduct.title || 'Primary Product',
                    images: Array.isArray(slide.primaryProduct.images) ? slide.primaryProduct.images : [],
                    image: slide.primaryProduct.image || slide.primaryProduct.imagePath
                }) 
            : null;
        
        // Handle secondary products with full data preservation
        const secondaryProducts = (slide.secondaryProducts || []).map((product, index) => {
            // If product is just an ID string
            if (typeof product === 'string') {
                return {
                    _id: product,
                    title: slide[`secondaryProductTitle${index}`] || `Secondary Product ${index + 1}`,
                    price: parseFloat(slide[`secondaryProductPrice${index}`]) || 0,
                    images: Array.isArray(slide[`secondaryProductImages${index}`]) ? slide[`secondaryProductImages${index}`] : [],
                    image: slide[`secondaryProductImage${index}`] || slide[`secondaryProductImagePath${index}`],
                    imagePath: slide[`secondaryProductImagePath${index}`] || slide[`secondaryProductImage${index}`]
                };
            }
            
            // If product is an object
            return {
                _id: product._id,
                title: product.title || `Secondary Product ${index + 1}`,
                price: parseFloat(product.price) || 0,
                images: Array.isArray(product.images) ? product.images : [],
                image: product.image || product.imagePath,
                imagePath: product.imagePath || product.image
            };
        });
        
        const normalizedSlide = {
            ...slide,
            title: slide.title || 'Untitled Slide',
            category,
            primaryProduct,
            secondaryProducts,
            order: slide.order || 0,
            image: slide.image || (primaryProduct ? getProductImage(primaryProduct) : null)
        };                console.log('Normalized slide:', normalizedSlide);
                return normalizedSlide;
            };
            
            let data = Array.isArray(response.data) ? response.data : [];
            console.log('Received data:', data);
            
            // Normalize all existing slides first
            const normalizedData = data.map(slide => normalizeSlide(slide));
            
            // Ensure we have exactly 3 slides
            const initializedSlides = Array(3).fill(null).map((_, index) => {
                return normalizedData[index] || {
                    title: 'Untitled Slide',
                    category: null,
                    primaryProduct: null,
                    secondaryProducts: [],
                    order: index,
                    image: '/placeholder-banner.jpg'
                };
            });
            
            // Update cache
            cache.current.bannerData = {
                data: initializedSlides,
                timestamp: now
            };
            
            setSlides(initializedSlides);
            loadSlideData(initializedSlides[currentSlide], currentSlide);
        } catch (error) {
            console.error('Error fetching banner:', error);
            toast.error('Failed to load banner data');
            // Initialize empty slides on error
            const emptySlides = Array(3).fill(null).map((_, index) => ({
                title: '',
                category: null,
                primaryProduct: null,
                secondaryProducts: [],
                order: index
            }));
            setSlides(emptySlides);
            loadSlideData(emptySlides[currentSlide], currentSlide);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategoryProducts = async (pageNum) => {
        if (!selectedCategory || !selectedCategory._id) {
            console.log('No category selected or invalid category:', selectedCategory);
            return;
        }

        console.log('Fetching products for category:', selectedCategory);
        setLoadingProducts(true);
        
        // Check cache
        const now = Date.now();
        if (cache.current.categoryProducts.data && 
            cache.current.categoryProducts.category === selectedCategory.name &&
            cache.current.categoryProducts.page === pageNum &&
            now - cache.current.categoryProducts.timestamp < CACHE_DURATION) {
            setCategoryProducts(cache.current.categoryProducts.data.products);
            setTotalPages(Math.ceil(cache.current.categoryProducts.data.total / PAGE_SIZE));
            setPage(pageNum);
            setLoadingProducts(false);
            return;
        }
        
        try {
            console.log('Fetching products with params:', {
                category: selectedCategory.name,
                isActive: true,
                page: pageNum,
                limit: PAGE_SIZE
            });
            
            const response = await API.get('/products', {
                params: {
                    category: selectedCategory.name,
                    isActive: true,
                    page: pageNum,
                    limit: PAGE_SIZE,
                    populate: ['category']
                }
            });
            
            console.log('Products API response:', response.data);

            // Update cache
            cache.current.categoryProducts = {
                data: response.data,
                timestamp: now,
                category: selectedCategory.name,
                page: pageNum
            };

            console.log('Category products response:', response.data);
            if (!response.data || !Array.isArray(response.data.products)) {
                console.error('Invalid products response format:', response.data);
                toast.error('Failed to load products: Invalid response format');
                setCategoryProducts([]);
                setTotalPages(1);
            } else {
                setCategoryProducts(response.data.products);
                setTotalPages(Math.ceil((response.data.total || response.data.products.length) / PAGE_SIZE));
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadSlideData = (slide, index) => {
        console.log('Loading slide data:', { 
            slide, 
            index,
            hasSecondaryProducts: slide?.secondaryProducts ? 'yes' : 'no',
            secondaryProductsType: slide?.secondaryProducts ? typeof slide.secondaryProducts : 'undefined',
            secondaryProductsCount: Array.isArray(slide?.secondaryProducts) ? slide.secondaryProducts.length : 0
        });
        
        if (!slide) {
            console.log('No slide data, initializing empty slide');
            // Initialize empty slide
            setCurrentSlide(index);
            setTitle('');
            setSelectedCategory(null);
            setSelectedPrimaryProduct(null);
            setSelectedSecondaryProducts([]);
            return;
        }

        // Always set the current slide index first
        setCurrentSlide(index);

        // Initialize secondary products array if it doesn't exist
        if (!Array.isArray(slide.secondaryProducts)) {
            slide.secondaryProducts = [];
        }

        // Set title with fallback
        setTitle(slide.title || '');
        
        // Process category data
        if (slide.category) {
            const categoryObj = typeof slide.category === 'string' 
                ? { 
                    _id: slide.category,
                    name: slide.categoryName || 'Unknown Category'
                }
                : {
                    _id: slide.category._id,
                    name: slide.category.name || 'Unknown Category'
                };
            console.log('Setting category:', categoryObj);
            setSelectedCategory(categoryObj);

            // Fetch products for this category
            if (categoryObj._id) {
                setPage(1);
                fetchCategoryProducts(1);
            }
        } else {
            console.log('No category found in slide');
            setSelectedCategory(null);
            setCategoryProducts([]);
        }

        // Process primary product with proper image handling
        let primaryProduct = null;
        if (slide.primaryProduct) {
            if (typeof slide.primaryProduct === 'string') {
                primaryProduct = {
                    _id: slide.primaryProduct,
                    title: slide.primaryProductTitle || 'Unknown Product',
                    price: parseFloat(slide.primaryProductPrice) || 0,
                    images: Array.isArray(slide.primaryProductImages) ? slide.primaryProductImages : [],
                    image: slide.primaryProductImage || slide.image || '',
                    imagePath: slide.primaryProductImagePath || slide.primaryProductImage || slide.image || ''
                };
            } else {
                primaryProduct = {
                    _id: slide.primaryProduct._id,
                    title: slide.primaryProduct.title || 'Unknown Product',
                    price: parseFloat(slide.primaryProduct.price) || 0,
                    images: Array.isArray(slide.primaryProduct.images) ? [...slide.primaryProduct.images] : [],
                    image: slide.primaryProduct.image || slide.primaryProduct.imagePath || '',
                    imagePath: slide.primaryProduct.imagePath || slide.primaryProduct.image || ''
                };
            }
        }
        console.log('Setting primary product:', primaryProduct);
        setSelectedPrimaryProduct(primaryProduct);

                // Handle secondary products with full object data
        const secondaryProducts = [];
        
        // Process secondary products
        if (slide.secondaryProducts && Array.isArray(slide.secondaryProducts)) {
            console.log('Processing secondary products:', slide.secondaryProducts);
            // Process each product and ensure it has all required fields
            secondaryProducts.push(...slide.secondaryProducts.map((product, index) => {
                console.log(`Processing secondary product ${index}:`, {
                    product,
                    type: typeof product,
                    hasImage: product ? !!product.image || !!product.imagePath : false,
                    hasImages: product ? Array.isArray(product.images) && product.images.length > 0 : false
                });
                
                // If product is just an ID string
                if (typeof product === 'string') {
                    const productData = {
                        _id: product,
                        title: slide[`secondaryProductTitle${index}`] || `Secondary Product ${index + 1}`,
                        price: parseFloat(slide[`secondaryProductPrice${index}`]) || 0,
                        image: slide[`secondaryProductImage${index}`] || slide[`secondaryImage${index+1}`],
                        imagePath: slide[`secondaryProductImagePath${index}`] || slide[`secondaryImage${index+1}`],
                        images: []
                    };
                    
                    // Ensure we have proper image URLs
                    if (productData.image) {
                        const imageUrl = getImageUrl('products', productData.image);
                        productData.image = imageUrl;
                        productData.imagePath = imageUrl;
                        productData.images = [imageUrl];
                    }
                    
                    return productData;
                }
                
                // If product is an object
                const processedProduct = {
                    _id: product._id,
                    title: product.title || `Secondary Product ${index + 1}`,
                    price: parseFloat(product.price) || 0,
                    image: product.image || product.imagePath,
                    imagePath: product.imagePath || product.image,
                    images: Array.isArray(product.images) ? [...product.images] : []
                };
                
                // Log the image fields before processing
                console.log(`Image fields for product ${index}:`, {
                    originalImage: product.image,
                    originalImagePath: product.imagePath,
                    originalImages: product.images,
                    processedImage: processedProduct.image,
                    processedImagePath: processedProduct.imagePath
                });
                
                // Ensure we have proper image URLs
                if (processedProduct.image) {
                    const imageUrl = getImageUrl('products', processedProduct.image);
                    processedProduct.image = imageUrl;
                    processedProduct.imagePath = imageUrl;
                }
                
                if (!processedProduct.image && processedProduct.imagePath) {
                    const imageUrl = getImageUrl('products', processedProduct.imagePath);
                    processedProduct.image = imageUrl;
                    processedProduct.imagePath = imageUrl;
                }
                
                if (processedProduct.images.length > 0) {
                    processedProduct.images = processedProduct.images.map(img => getImageUrl('products', img));
                    if (!processedProduct.image) {
                        processedProduct.image = processedProduct.image || processedProduct.images[0];
                        processedProduct.imagePath = processedProduct.images[0];
                    }
                } else if (processedProduct.image) {
                    processedProduct.images = [processedProduct.image];
                }
                
                console.log(`Processed product ${index}:`, processedProduct);
                return processedProduct;
            }));
        } else {
            // Try individual secondary image fields
            for (let i = 1; i <= 3; i++) {
                const image = slide[`secondaryImage${i}`];
                if (image) {
                    secondaryProducts.push({
                        _id: `secondary_${i}`,
                        image: image,
                        title: slide[`secondaryProductTitle${i-1}`] || `Secondary Product ${i}`,
                        images: [image],
                        price: slide[`secondaryProductPrice${i-1}`] || 0
                    });
                }
            }
        }

        console.log('Processed secondary products:', secondaryProducts);
        setSelectedSecondaryProducts(secondaryProducts);        // Reset page when loading new slide
        setPage(1);
    };

    const handleCategorySelect = (category) => {
        // Reset products when category changes
        console.log('🏷️ [BANNER] Category selected:', category);
        setSelectedCategory(category);
        setSelectedPrimaryProduct(null);
        setSelectedSecondaryProducts([]);
        setPage(1);
        
        // Clear category products cache when changing categories
        cache.current.categoryProducts = {
            data: null,
            timestamp: 0,
            category: null,
            page: null
        };
    };

    const handleProductSelect = (product) => {
        if (selectionMode === 'primary') {
            setSelectedPrimaryProduct(product);
        } else {
            if (selectedSecondaryProducts.length < 3 && 
                !selectedSecondaryProducts.find(p => p._id === product._id)) {
                setSelectedSecondaryProducts([...selectedSecondaryProducts, product]);
            }
        }
    };

    const handleRemoveProduct = (product, isPrimary = false) => {
        if (isPrimary) {
            setSelectedPrimaryProduct(null);
        } else {
            setSelectedSecondaryProducts(selectedSecondaryProducts.filter(p => p._id !== product._id));
        }
    };

    const handleSaveSlide = async () => {
        // Initial input validation
        const validationErrors = [];
        
        if (!title || title.trim() === '') {
            validationErrors.push('Slide title is required');
        }
        
        if (!selectedCategory || (!selectedCategory._id && typeof selectedCategory !== 'string')) {
            validationErrors.push('Please select a category');
        }
        
        if (!selectedPrimaryProduct || (!selectedPrimaryProduct._id && typeof selectedPrimaryProduct !== 'string')) {
            validationErrors.push('Please select a primary product');
        }
        
        if (!selectedSecondaryProducts || selectedSecondaryProducts.length !== 3) {
            validationErrors.push('Please select exactly 3 secondary products');
        }

        if (validationErrors.length > 0) {
            console.warn('Validation errors:', validationErrors);
            toast.error(validationErrors.join('\n'));
            return;
        }

        // Keep track of previous state for rollback
        const prevSlides = [...slides];
        
        try {
            setSaving(true);

            // Get and verify auth token
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Format the current slide data with proper ID extraction and data preservation
            const formatId = (item) => {
                if (!item) return null;
                if (typeof item === 'string') return item;
                if (item._id) return item._id;
                return null;
            };

            // Format secondary product data
            const formatProduct = (product, index) => {
                if (!product) return null;
                return {
                    _id: formatId(product),
                    title: product.title || `Secondary Product ${index + 1}`,
                    price: product.price || 0,
                    image: product.image || product.imagePath,
                    images: Array.isArray(product.images) ? product.images : [product.image || product.imagePath].filter(Boolean)
                };
            };

            // Log raw data before formatting
            console.log('Raw data before formatting:', {
                title,
                category: selectedCategory,
                primaryProduct: selectedPrimaryProduct,
                secondaryProducts: selectedSecondaryProducts,
                secondaryProducts: selectedSecondaryProducts
            });

            // Format and validate each part separately
            const formattedTitle = title.trim();
            const formattedCategory = formatId(selectedCategory);
            const formattedPrimaryProduct = formatId(selectedPrimaryProduct);
            
            // Format secondary products with full data
            const formattedSecondaryProducts = Array.isArray(selectedSecondaryProducts) 
                ? selectedSecondaryProducts.map((product, index) => ({
                    _id: product._id,  // Keep the original _id
                    title: product.title || `Secondary Product ${index + 1}`,
                    price: product.price || 0,
                    image: product.image || product.imagePath || (Array.isArray(product.images) && product.images[0]),
                    imagePath: product.imagePath || product.image || (Array.isArray(product.images) && product.images[0]),
                    images: Array.isArray(product.images) ? product.images : [product.image || product.imagePath].filter(Boolean)
                }))
                : [];

            // Log raw data for debugging
            console.log('Raw data:', {
                title,
                category: selectedCategory,
                primaryProduct: selectedPrimaryProduct,
                secondaryProducts: selectedSecondaryProducts
            });

            // Log formatted data
            console.log('Formatted data:', {
                title: formattedTitle,
                category: formattedCategory,
                primaryProduct: formattedPrimaryProduct,
                secondaryProducts: formattedSecondaryProducts
            });

            // Validate each part
            if (!formattedCategory) {
                throw new Error('Invalid category');
            }
            if (!formattedPrimaryProduct) {
                throw new Error('Invalid primary product');
            }
            if (!Array.isArray(formattedSecondaryProducts) || formattedSecondaryProducts.length !== 3) {
                throw new Error('Exactly 3 secondary products are required');
            }

            // Extract image from primary product
            const slideImage = selectedPrimaryProduct && selectedPrimaryProduct.images && selectedPrimaryProduct.images.length > 0
                ? selectedPrimaryProduct.images[0]
                : (selectedPrimaryProduct && selectedPrimaryProduct.image)
                    ? selectedPrimaryProduct.image
                    : 'default-banner.jpg';

            const currentSlideData = {
                title: formattedTitle,
                category: formattedCategory,
                primaryProduct: formattedPrimaryProduct,
                secondaryProducts: formattedSecondaryProducts,
                order: currentSlide,
                image: slideImage  // Add the image field
            };

            // Log final formatted data
            console.log('Final formatted data:', currentSlideData);

            console.log('Formatted current slide:', currentSlideData);

            // Validate the formatted data
            if (!currentSlideData.category || !currentSlideData.primaryProduct || currentSlideData.secondaryProducts.length !== 3) {
                throw new Error('Invalid data format after processing');
            }

            // Validate data before sending
            if (!currentSlideData.category || !currentSlideData.primaryProduct || 
                !Array.isArray(currentSlideData.secondaryProducts) || 
                currentSlideData.secondaryProducts.length !== 3) {
                console.error('Invalid data structure:', currentSlideData);
                throw new Error('Data validation failed');
            }

            // Validate all required fields are present
            if (!formattedTitle || !formattedCategory || !formattedPrimaryProduct || formattedSecondaryProducts.length !== 3) {
                const missing = [];
                if (!formattedTitle) missing.push('title');
                if (!formattedCategory) missing.push('category');
                if (!formattedPrimaryProduct) missing.push('primary product');
                if (formattedSecondaryProducts.length !== 3) missing.push('3 secondary products');
                throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }

            // Create request data with all slides
            const requestData = {
                slides: slides.map((slide, index) => {
                    if (index === currentSlide) {
                        // Return the new data for current slide
                        return {
                            title: formattedTitle,
                            category: formattedCategory,
                            primaryProduct: {
                                _id: selectedPrimaryProduct._id,
                                title: selectedPrimaryProduct.title,
                                price: selectedPrimaryProduct.price,
                                image: selectedPrimaryProduct.image || selectedPrimaryProduct.imagePath || (Array.isArray(selectedPrimaryProduct.images) && selectedPrimaryProduct.images[0]),
                                imagePath: selectedPrimaryProduct.imagePath || selectedPrimaryProduct.image || (Array.isArray(selectedPrimaryProduct.images) && selectedPrimaryProduct.images[0]),
                                images: selectedPrimaryProduct.images || []
                            },
                            secondaryProducts: selectedSecondaryProducts.map(product => ({
                                _id: product._id,
                                title: product.title,
                                price: product.price,
                                image: product.image || product.imagePath || (Array.isArray(product.images) && product.images[0]),
                                imagePath: product.imagePath || product.image || (Array.isArray(product.images) && product.images[0]),
                                images: product.images || []
                            })),
                            order: index,
                            image: slideImage
                        };
                    }
                    // Return existing data for other slides
                    // If it's an empty slide, provide default values that satisfy validation
                    return {
                        title: slide.title || 'Untitled Slide',
                        category: slide.category?._id || slide.category || null,
                        primaryProduct: slide.primaryProduct?._id || slide.primaryProduct || null,
                        secondaryProducts: slide.secondaryProducts?.map(p => p._id || p) || [],
                        order: index,
                        image: slide.image || '/placeholder-banner.jpg' // Provide default image path
                    };
                })
            };

            // Log the final request data
            console.log('Request data:', JSON.stringify(requestData, null, 2));

            console.log('Sending request:', {
                url: getApiUrl('api/homepage/banners'),
                data: JSON.stringify(requestData, null, 2),
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Make the API call
            try {
                const apiResponse = await API.put('/homepage/banners', requestData);

                // Log the complete response
                console.log('API Response:', {
                    status: apiResponse.status,
                    data: apiResponse.data,
                    headers: apiResponse.headers
                });

                if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
                    throw new Error('Invalid server response');
                }

                // Update the local slides array
                const newSlides = slides.map((slide, index) => {
                    if (index === currentSlide) {
                        return {
                            ...currentSlideData,
                            // Keep the full objects for the UI
                            category: selectedCategory,
                            primaryProduct: selectedPrimaryProduct,
                            secondaryProducts: selectedSecondaryProducts
                        };
                    }
                    return slide;
                });

                // Update states and cache
                setSlides(newSlides);
                cache.current.bannerData = {
                    data: newSlides,
                    timestamp: Date.now()
                };

                console.log('Save successful');
                toast.success('Slide saved successfully');
            } catch (apiError) {
                console.error('API call failed:', apiError);
                throw new Error(apiError.response?.data?.message || apiError.message || 'Failed to save banner data');
            }
        } catch (error) {
            // Rollback on error
            setSlides(prevSlides);
            
            console.error('Error saving slide:', error);
            
            // Log detailed error information for debugging
            console.error('Error details:', {
                response: error.response?.data,
                status: error.response?.status,
                message: error.message,
                config: error.config,
                data: error.response?.config?.data
            });
            
            // Handle specific error cases
            if (error.message === 'Authentication required') {
                toast.error('Please log in again to continue.');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('token');
                return;
            }
            
            if (error.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('token');
                return;
            }
            
            if (error.response?.status === 500) {
                // Log the full server error details
                console.error('Server error details:', {
                    data: error.response?.data,
                    headers: error.response?.headers,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    requestData: JSON.parse(error.config?.data || '{}'),
                    requestUrl: error.config?.url
                });
                
                const errorMessage = error.response?.data?.message || 'Server error occurred. Please try again.';
                toast.error(errorMessage);
                return;
            }
            
            if (!navigator.onLine) {
                toast.error('Network connection lost. Please check your internet connection and try again.');
                return;
            }
            
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
                return;
            }
            
            toast.error('Failed to save slide. Please try again.');
            
            // Clear cache to force fresh data on next load
            cache.current.bannerData = {
                data: null,
                timestamp: 0
            };
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlide = async (index) => {
        const prevSlides = [...slides];
        const newSlides = slides.filter((_, i) => i !== index);
        
        try {
            // Optimistic update
            setSlides(newSlides);
            
            const response = await API.put('/homepage/banners', { 
                slides: newSlides.map((slide, i) => ({
                    title: slide.title,
                    category: slide.category._id,
                    primaryProduct: slide.primaryProduct._id,
                    secondaryProducts: slide.secondaryProducts.map(p => p._id),
                    order: i
                }))
            });

            // Update cache
            cache.current.bannerData = {
                data: response.data,
                timestamp: Date.now()
            };

            toast.success('Slide deleted successfully');

            // Update current slide if needed
            if (index <= currentSlide && currentSlide > 0) {
                loadSlideData(response.data[currentSlide - 1], currentSlide - 1);
            }
        } catch (error) {
            // Rollback on error
            setSlides(prevSlides);
            console.error('Error deleting slide:', error);
            toast.error('Failed to delete slide');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">Banner Management</Typography>
                <Button
                    startIcon={isPreviewMode ? null : <Eye />}
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                    {isPreviewMode ? 'Back to Edit' : 'Preview'}
                </Button>
            </Box>

            {isPreviewMode ? (
                <BannerPreview
    slides={slides.map((slide, index) => {
        // Get the selected products for the current slide
        const currentSlideSecondaryProducts = index === currentSlide ? selectedSecondaryProducts : slide.secondaryProducts;
        
        console.log('🔍 DEBUG Secondary Products:', {
            slideIndex: index,
            isCurrentSlide: index === currentSlide,
            selectedSecondaryProducts,
            currentSlideSecondaryProducts,
            rawSecondaryProducts: slide.secondaryProducts
        });

        // Process secondary products
        let processedSecondaryProducts = Array.isArray(currentSlideSecondaryProducts) ? 
            currentSlideSecondaryProducts.map((product, idx) => {
                console.log(`🔍 Processing secondary product ${idx}:`, {
                    product,
                    hasImage: product ? !!product.image || !!product.imagePath : false,
                    hasImages: product ? Array.isArray(product.images) && product.images.length > 0 : false
                });

                if (!product) {
                    console.log(`⚠️ No product data for slot ${idx}`);
                    return null;
                }

                const processed = {
                    ...product,
                    _id: product._id,
                    title: product.title,
                    price: product.price || 0,
                    image: product.image || product.imagePath,
                    images: product.images || [],
                    imagePath: product.imagePath || product.image
                };

                console.log(`✅ Processed product ${idx}:`, processed);
                return processed;
            }) : [];

        // Ensure we always have exactly 3 slots for secondary products
        while (processedSecondaryProducts.length < 3) {
            processedSecondaryProducts.push(null);
        }

        console.log('Processing slide for preview:', {
            title: slide.title,
            primaryProduct: slide.primaryProduct,
            secondaryProducts: processedSecondaryProducts.map(p => p ? {
                id: p._id,
                title: p.title,
                hasImage: !!p.image || !!p.imagePath || (Array.isArray(p.images) && p.images.length > 0)
            } : 'empty slot')
        });

        return {
            ...slide,
            title: slide.title || 'Untitled Slide',
            primaryProduct: slide.primaryProduct || null,
            secondaryProducts: processedSecondaryProducts,
            category: slide.category || { name: 'Uncategorized' }
        };
    })}
    onBackClick={() => setIsPreviewMode(false)}
/>
            ) : (
                <>
                    <Tabs
                        value={currentSlide}
                        onChange={(e, newValue) => loadSlideData(slides[newValue], newValue)}
                        sx={{ mb: 3 }}
                    >
                        <Tab label="Slide 1" />
                        <Tab label="Slide 2" />
                        <Tab label="Slide 3" />
                    </Tabs>

                    <Paper sx={{ p: 3 }}>
                        <Box mb={3}>
                            <TextField
                                label="Slide Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                fullWidth
                                required
                                sx={{ mb: 2 }}
                            />
                            
                            <CategorySelector
                                selectedCategory={selectedCategory}
                                onCategoryChange={handleCategorySelect}
                                returnFullObject={true}
                            />
                        </Box>

                        {selectedCategory && (
                            <Box mb={3}>
                                <Typography variant="h6" gutterBottom>Primary Product</Typography>
                                {selectedPrimaryProduct ? (
                                    <Card sx={{ 
                                        maxWidth: 200,
                                        backgroundColor: '#ffffff',
                                        boxShadow: 2,
                                        '&:hover': { boxShadow: 3 }
                                    }}>
                                        <Box sx={{ position: 'relative' }}>
                                            {getProductImage(selectedPrimaryProduct) ? (
                                                <CardMedia
                                                    component="img"
                                                    height="140"
                                                    image={getProductImage(selectedPrimaryProduct)}
                                                    alt={selectedPrimaryProduct.title}
                                                    sx={{ 
                                                        objectFit: 'contain',
                                                        backgroundColor: '#f5f5f5',
                                                    }}
                                                />
                                            ) : (
                                                <Box
                                                    height="140"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    sx={{ backgroundColor: '#f5f5f5' }}
                                                >
                                                    <Typography color="text.secondary">
                                                        Image not found
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    left: 8,
                                                    bgcolor: 'primary.main',
                                                    color: 'white',
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                Primary
                                            </Typography>
                                        </Box>
                                        <CardContent sx={{ p: 1.5 }}>
                                            <Typography variant="subtitle2" noWrap gutterBottom>
                                                {selectedPrimaryProduct.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                ${selectedPrimaryProduct.price}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ p: 1, pt: 0, justifyContent: 'flex-end' }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveProduct(selectedPrimaryProduct, true)}
                                                color="error"
                                            >
                                                <Trash2 fontSize="small" />
                                            </IconButton>
                                        </CardActions>
                                    </Card>
                                ) : (
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            setSelectionMode('primary');
                                            setShowProductSelection(true);
                                        }}
                                    >
                                        Select Primary Product
                                    </Button>
                                )}

                                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Secondary Products</Typography>
                                <Grid container spacing={1}>
                                    {selectedSecondaryProducts.map((product, index) => (
                                        <Grid item xs={6} sm={4} md={3} key={product._id}>
                                            <Card sx={{ 
                                                height: '100%', 
                                                display: 'flex', 
                                                flexDirection: 'column',
                                                maxWidth: 160,
                                                margin: 'auto'
                                            }}>
                                                {getProductImage(product) ? (
                                                    <CardMedia
                                                        component="img"
                                                        height="120"
                                                        image={getProductImage(product)}
                                                        alt={product.title}
                                                        sx={{ 
                                                            objectFit: 'contain',
                                                            backgroundColor: '#f5f5f5',
                                                            p: 1
                                                        }}
                                                    />
                                                ) : (
                                                    <Box
                                                        height="120"
                                                        display="flex"
                                                        alignItems="center"
                                                        justifyContent="center"
                                                        sx={{ backgroundColor: '#f5f5f5' }}
                                                    >
                                                        <Typography color="text.secondary">
                                                            Image not found
                                                        </Typography>
                                                    </Box>
                                                )}
                                                <CardContent sx={{ p: 1, flexGrow: 1 }}>
                                                    <Typography variant="subtitle2" noWrap>{product.title}</Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        ${product.price}
                                                    </Typography>
                                                </CardContent>
                                                <CardActions sx={{ p: 0.5, justifyContent: 'flex-end' }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleRemoveProduct(product)}
                                                        color="error"
                                                    >
                                                        <Trash2 fontSize="small" />
                                                    </IconButton>
                                                </CardActions>
                                            </Card>
                                        </Grid>
                                    ))}
                                    {selectedSecondaryProducts.length < 3 && (
                                        <Grid item xs={12} sm={6} md={4}>
                                            <Button
                                                variant="outlined"
                                                onClick={() => {
                                                    setSelectionMode('secondary');
                                                    setShowProductSelection(true);
                                                }}
                                                sx={{ height: '100%', minHeight: 140 }}
                                                fullWidth
                                            >
                                                Add Secondary Product
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        )}

                        <Box display="flex" justifyContent="flex-end" mt={3}>
                            <Button
                                variant="contained"
                                onClick={handleSaveSlide}
                                disabled={saving || !selectedCategory || !selectedPrimaryProduct || selectedSecondaryProducts.length !== 3}
                            >
                                {saving ? 'Saving...' : 'Save Slide'}
                            </Button>
                        </Box>
                    </Paper>
                </>
            )}

            <Modal
                open={showProductSelection}
                onClose={() => setShowProductSelection(false)}
            >
                <Box sx={modalStyle}>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        mb: 3
                    }}>
                        <Typography variant="h6">
                            Select {selectionMode === 'primary' ? 'Primary' : 'Secondary'} Product
                        </Typography>
                        <IconButton 
                            onClick={() => setShowProductSelection(false)}
                            size="small"
                            sx={{ ml: 2 }}
                        >
                            <X />
                        </IconButton>
                    </Box>
                    
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            debouncedSearch(e.target.value);
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilteredProducts(categoryProducts);
                                        }}
                                    >
                                        <X fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ 
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {loadingProducts ? (
                            <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                minHeight: 300 
                            }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ mb: 2, mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {searchTerm ? `Search results: ${filteredProducts.length} products found` :
                                         `Showing ${categoryProducts.length} products`}
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    {(searchTerm ? filteredProducts : categoryProducts).map(product => (
                                            <Grid item xs={6} sm={4} md={3} key={product._id}>
                                                <Card 
                                                    sx={{ 
                                                        cursor: 'pointer',
                                                        '&:hover': { 
                                                            boxShadow: 6,
                                                            transform: 'translateY(-2px)',
                                                            transition: 'all 0.2s ease-in-out'
                                                        },
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        height: '100%',
                                                        position: 'relative',
                                                        transition: 'all 0.2s ease-in-out',
                                                        opacity: selectionMode === 'secondary' && 
                                                                selectedPrimaryProduct?._id === product._id ? 0.5 : 1,
                                                        ...(selectionMode === 'primary' && selectedPrimaryProduct?._id === product._id && {
                                                            border: '2px solid #1976d2',
                                                            boxShadow: '0 0 5px rgba(25, 118, 210, 0.3)'
                                                        }),
                                                        ...(selectionMode === 'secondary' && selectedSecondaryProducts.some(p => p._id === product._id) && {
                                                            border: '2px solid #1976d2',
                                                            boxShadow: '0 0 5px rgba(25, 118, 210, 0.3)'
                                                        })
                                                    }}
                                                    onClick={() => {
                                                        if (selectionMode === 'secondary' && selectedPrimaryProduct?._id === product._id) {
                                                            // Don't allow selecting primary product as secondary
                                                            return;
                                                        }
                                                        if (selectionMode === 'primary') {
                                                            // For primary, select and close modal
                                                            setSelectedPrimaryProduct(product);
                                                            setShowProductSelection(false);
                                                        } else {
                                                            // For secondary, toggle selection
                                                            const existingIndex = selectedSecondaryProducts.findIndex(p => p._id === product._id);
                                                            if (existingIndex !== -1) {
                                                                const newProducts = [...selectedSecondaryProducts];
                                                                newProducts.splice(existingIndex, 1);
                                                                setSelectedSecondaryProducts(newProducts);
                                                            } else if (selectedSecondaryProducts.length < 3) {
                                                                setSelectedSecondaryProducts([...selectedSecondaryProducts, product]);
                                                            }
                                                        }
                                                    }}
                                                >
                                                <Box 
                                                    sx={{ 
                                                        height: '140px',
                                                        width: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: '#f5f5f5',
                                                        padding: '8px'
                                                    }}
                                                >
                                                    {getProductImage(product) ? (
                                                        <CardMedia
                                                            component="img"
                                                            image={getProductImage(product)}
                                                            alt={product.title}
                                                            sx={{ 
                                                                height: '100%',
                                                                width: '100%',
                                                                objectFit: 'contain'
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            height="100%"
                                                            display="flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            sx={{ backgroundColor: '#f5f5f5' }}
                                                        >
                                                            <Typography color="text.secondary">
                                                                Image not found
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                                <CardContent 
                                                    sx={{ 
                                                        p: 1,
                                                        height: '80px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Typography 
                                                        variant="subtitle2"
                                                        sx={{ 
                                                            fontSize: '0.875rem',
                                                            textAlign: 'center',
                                                            overflow: 'hidden',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            lineHeight: 1.2,
                                                            mb: 1
                                                        }}
                                                    >
                                                        {product.title}
                                                    </Typography>
                                                    <Typography 
                                                        variant="body2" 
                                                        color="primary"
                                                        sx={{ fontWeight: 'bold' }}
                                                    >
                                                        ${product.price}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                                {totalPages > 1 && (
                                    <Box display="flex" justifyContent="center" mt={2}>
                                        <Pagination
                                            count={totalPages}
                                            page={page}
                                            onChange={(e, value) => fetchCategoryProducts(value)}
                                            color="primary"
                                            disabled={loadingProducts}
                                        />
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
};

export default BannerManagement;
