import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Tabs,
    Tab,
    Paper,
    TextField
} from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { toast } from 'react-toastify';
import API from '../../../api';
import ProductCard from './components/ProductCard';
import ProductSelectionModal from './components/ProductSelectionModal';
import BannerPreview from './components/BannerPreview';
import { getImageUrl, config } from '../../../config';
import CategorySelector from './CategorySelector';

const CACHE_DURATION = 30000; // 30 seconds
const PAGE_SIZE = 12;

const processProduct = (product) => {
    if (!product) return null;
    
    // Clean up the product data
    const cleanedProduct = {
        ...product,
        images: (product.images || []).filter(img => img && img !== 'placeholder.jpg'),
        image: product.image && product.image !== 'placeholder.jpg' ? product.image : '',
        name: product.name || product.title || 'Untitled Product'
    };

    return cleanedProduct;
};

const BannerManagement = () => {
    // Core state
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
    const [selectionMode, setSelectionMode] = useState('primary');
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingProducts, setLoadingProducts] = useState(false);
    
    // Cache
    const cache = useRef({
        bannerData: { data: null, timestamp: 0 },
        categoryProducts: { data: null, timestamp: 0, category: null, page: null }
    });
    
    // Preview mode
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    useEffect(() => {
        fetchBannerData();
    }, []);

    useEffect(() => {
        if (selectedCategory?._id) {
            fetchCategoryProducts(page);
        }
    }, [selectedCategory, page]);

    useEffect(() => {
        if (slides[currentSlide]) {
            loadSlideData(slides[currentSlide], currentSlide);
        }
    }, [currentSlide]);

    // Core data fetching
    const fetchBannerData = async () => {
        const now = Date.now();
        if (cache.current.bannerData.data && now - cache.current.bannerData.timestamp < CACHE_DURATION) {
            console.log('Using cached banner data');
            setSlides(cache.current.bannerData.data);
            if (cache.current.bannerData.data.length > 0) {
                loadSlideData(cache.current.bannerData.data[currentSlide], currentSlide);
            }
            setLoading(false);
            return;
        }

        console.log('Fetching fresh banner data from /banner endpoint...');
        try {
            const response = await API.get('/banner');
            console.log('Banner response received:', response.data);
            
            const data = Array.isArray(response.data) ? response.data : [];
            console.log('Processed banner data:', data);
            
            const initializedSlides = Array(3).fill(null).map((_, index) => {
                const slideData = data[index];
                if (slideData) {
                    console.log(`Processing slide ${index}:`, slideData);
                    return {
                        _id: slideData._id,
                        title: slideData.title || '',
                        category: slideData.category || null,
                        primaryProduct: slideData.primaryProduct || null,
                        secondaryProducts: slideData.secondaryProducts || [],
                        image: slideData.image || '',
                        order: slideData.order || index
                    };
                } else {
                    return {
                        title: '',
                        category: null,
                        primaryProduct: null,
                        secondaryProducts: [],
                        order: index
                    };
                }
            });
            
            console.log('Initialized slides:', initializedSlides);
            
            cache.current.bannerData = {
                data: initializedSlides,
                timestamp: now
            };
            
            setSlides(initializedSlides);
            loadSlideData(initializedSlides[currentSlide], currentSlide);
        } catch (error) {
            console.error('Error fetching banner:', error);
            console.error('Error response:', error.response?.data);
            toast.error('Failed to load banner data');
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
        if (!selectedCategory?._id) return;

        setLoadingProducts(true);
        
        // Check cache
        const now = Date.now();
        if (cache.current.categoryProducts.data && 
            cache.current.categoryProducts.category === selectedCategory.name &&
            cache.current.categoryProducts.page === pageNum &&
            now - cache.current.categoryProducts.timestamp < CACHE_DURATION) {
            setCategoryProducts(cache.current.categoryProducts.data.products);
            // Fix: Use totalProducts instead of total to match backend response
            const total = cache.current.categoryProducts.data.totalProducts || cache.current.categoryProducts.data.total || 0;
            setTotalPages(Math.ceil(total / PAGE_SIZE));
            setPage(pageNum);
            setLoadingProducts(false);
            return;
        }
        
        try {
            const response = await API.get('/products', {
                params: {
                    category: selectedCategory.name,
                    isActive: true,
                    page: pageNum,
                    limit: PAGE_SIZE,
                    populate: ['category']
                }
            });

            cache.current.categoryProducts = {
                data: response.data,
                timestamp: now,
                category: selectedCategory.name,
                page: pageNum
            };

            if (response.data?.products) {
                setCategoryProducts(response.data.products);
                // Fix: Use totalProducts instead of total to match backend response
                const total = response.data.totalProducts || response.data.total || 0;
                setTotalPages(Math.ceil(total / PAGE_SIZE));
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoadingProducts(false);
        }
    };

    // Data handling
    const loadSlideData = (slide, index) => {
        console.log('Loading slide data:', { slide, index });
        
        if (!slide) {
            setCurrentSlide(index);
            setTitle('');
            setSelectedCategory(null);
            setSelectedPrimaryProduct(null);
            setSelectedSecondaryProducts([]);
            return;
        }

        setCurrentSlide(index);
        setTitle(slide.title || '');

        // Handle category - could be populated or just an ID
        if (slide.category) {
            if (typeof slide.category === 'string') {
                setSelectedCategory({ 
                    _id: slide.category,
                    name: slide.categoryName || 'Unknown Category'
                });
            } else {
                setSelectedCategory({
                    _id: slide.category._id || slide.category,
                    name: slide.category.name || 'Unknown Category'
                });
            }
        } else {
            setSelectedCategory(null);
            setCategoryProducts([]);
        }

        // Handle primary product with image URL processing
        if (slide.primaryProduct) {
            const primaryProduct = {
                ...slide.primaryProduct,
                images: Array.isArray(slide.primaryProduct.images) 
                    ? slide.primaryProduct.images.map(img => 
                        typeof img === 'string' && !img.startsWith('http') 
                            ? getImageUrl('products', img) 
                            : img
                      )
                    : [],
                image: slide.primaryProduct.image && !slide.primaryProduct.image.startsWith('http') 
                    ? getImageUrl('products', slide.primaryProduct.image)
                    : slide.primaryProduct.image
            };
            setSelectedPrimaryProduct(primaryProduct);
        } else {
            setSelectedPrimaryProduct(null);
        }

        // Handle secondary products with image URL processing
        if (Array.isArray(slide.secondaryProducts)) {
            const secondaryProducts = slide.secondaryProducts.map(product => ({
                ...product,
                images: Array.isArray(product.images) 
                    ? product.images.map(img => 
                        typeof img === 'string' && !img.startsWith('http') 
                            ? getImageUrl('products', img) 
                            : img
                      )
                    : [],
                image: product.image && !product.image.startsWith('http') 
                    ? getImageUrl('products', product.image)
                    : product.image
            }));
            setSelectedSecondaryProducts(secondaryProducts);
        } else {
            setSelectedSecondaryProducts([]);
        }

        setPage(1);
    };

    // Event handlers
    const handleCategorySelect = (category) => {
        console.log('🏷️ [BANNER NEW] Category selected:', category);
        setSelectedCategory(category);
        setSelectedPrimaryProduct(null);
        setSelectedSecondaryProducts([]);
        setPage(1);
        cache.current.categoryProducts = { data: null, timestamp: 0, category: null, page: null };
    };

    const handleProductSelect = (product) => {
        const processedProduct = processProduct(product);
        
        if (selectionMode === 'primary') {
            setSelectedPrimaryProduct(processedProduct);
            setShowProductSelection(false);
        } else {
            if (selectedSecondaryProducts.length < 3 && 
                !selectedSecondaryProducts.find(p => p._id === processedProduct._id)) {
                setSelectedSecondaryProducts([...selectedSecondaryProducts, processedProduct]);
                if (selectedSecondaryProducts.length === 2) {
                    setShowProductSelection(false);
                }
            }
        }
    };

    const handleRemoveProduct = (product, isPrimary = false) => {
        if (isPrimary) {
            setSelectedPrimaryProduct(null);
        } else {
            setSelectedSecondaryProducts(prev => prev.filter(p => p._id !== product._id));
        }
    };

    const handleSaveSlide = async () => {
        console.log('🚀 Save slide button clicked!');
        console.log('📋 Current form data:', {
            title,
            selectedCategory,
            selectedPrimaryProduct,
            selectedSecondaryProducts: selectedSecondaryProducts.length,
            saving
        });
        
        const validationErrors = [];
        
        if (!title?.trim()) validationErrors.push('Slide title is required');
        if (!selectedCategory) validationErrors.push('Please select a category');
        if (!selectedPrimaryProduct?._id) validationErrors.push('Please select a primary product');
        if (selectedSecondaryProducts.length !== 3) validationErrors.push('Please select exactly 3 secondary products');

        if (validationErrors.length > 0) {
            console.log('❌ Validation failed:', validationErrors);
            toast.error(validationErrors.join('\n'));
            return;
        }

        console.log('✅ Validation passed, starting save process...');
        const prevSlides = [...slides];
        setSaving(true);
        console.log('🔄 Setting saving state to true - animation should show now');
        
        try {
            // Prepare current slide data with proper image from primary product
            const slideImage = selectedPrimaryProduct.image || 
                              selectedPrimaryProduct.image || (selectedPrimaryProduct.images && selectedPrimaryProduct.images[0]) || 
                              selectedPrimaryProduct.imagePath || 
                              'placeholder.jpg';

            const currentSlideData = {
                _id: slides[currentSlide]?._id,
                title: title.trim(),
                category: selectedCategory._id,
                primaryProduct: {
                    _id: selectedPrimaryProduct._id,
                    title: selectedPrimaryProduct.title,
                    price: selectedPrimaryProduct.price,
                    image: selectedPrimaryProduct.image || selectedPrimaryProduct.imagePath,
                    imagePath: selectedPrimaryProduct.imagePath,
                    images: selectedPrimaryProduct.images || [],
                    category: selectedPrimaryProduct.category
                },
                secondaryProducts: selectedSecondaryProducts.map(product => ({
                    _id: product._id,
                    title: product.title,
                    price: product.price,
                    image: product.image || product.imagePath,
                    imagePath: product.imagePath,
                    images: product.images || [],
                    category: product.category
                })),
                image: slideImage,
                order: currentSlide
            };

            // Update slides array - only update current slide
            const updatedSlides = [...slides];
            updatedSlides[currentSlide] = currentSlideData;

            // Format all slides for backend (preserve existing data for other slides)
            const formattedSlides = updatedSlides.map((slide, index) => {
                if (!slide || (!slide.title && !slide.primaryProduct)) {
                    // Return minimal structure for empty slides
                    return {
                        title: 'Untitled Slide',
                        category: null,
                        primaryProduct: null,
                        secondaryProducts: [],
                        image: 'placeholder.jpg',
                        order: index
                    };
                }

                return {
                    _id: slide._id,
                    title: slide.title || 'Untitled Slide',
                    category: slide.category,
                    primaryProduct: slide.primaryProduct,
                    secondaryProducts: slide.secondaryProducts || [],
                    image: slide.image || 'placeholder.jpg',
                    order: index
                };
            });

            console.log('📤 Sending slide data:', {
                currentSlide,
                slideData: currentSlideData,
                allSlides: formattedSlides
            });

            console.log('🌐 Making API call to /banner...');
            // Send to backend
            const response = await API.put('/banner', { 
                slides: formattedSlides 
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📥 API response received:', response.data);
            
            // Update local state with the response
            if (response.data && Array.isArray(response.data)) {
                setSlides(response.data);
                // Refresh cache
                cache.current.bannerData = {
                    data: response.data,
                    timestamp: Date.now()
                };
            } else {
                // Fallback to local update
                setSlides(updatedSlides);
            }

            toast.success('Slide saved successfully');
        } catch (error) {
            console.error('Error saving slide:', error);
            console.error('Error details:', {
                response: error.response?.data,
                status: error.response?.status,
                headers: error.response?.headers,
                config: error.config
            });
            toast.error(`Failed to save slide: ${error.response?.data?.message || error.message}`);
            setSlides(prevSlides);
        } finally {
            setSaving(false);
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
                    startIcon={isPreviewMode ? null : <PreviewIcon />}
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                    {isPreviewMode ? 'Back to Edit' : 'Preview'}
                </Button>
            </Box>

            {isPreviewMode ? (
                <>
                    {console.log('🎯 Passing to BannerPreview:', {
                        slidesCount: slides.length,
                        currentSlide,
                        activeSlide: slides[currentSlide] ? {
                            title: slides[currentSlide].title,
                            primaryProduct: slides[currentSlide].primaryProduct,
                            secondaryProducts: slides[currentSlide].secondaryProducts
                        } : null,
                        currentFormData: {
                            title,
                            selectedPrimaryProduct,
                            selectedSecondaryProducts
                        }
                    })}
                    <BannerPreview
                        slides={slides.map((slide, index) => {
                            // If this is the current slide and we have form data, use form data for preview
                            if (index === currentSlide && (title || selectedPrimaryProduct || selectedSecondaryProducts.length > 0)) {
                                return {
                                    ...slide,
                                    title: title || slide?.title || 'Untitled Slide',
                                    primaryProduct: selectedPrimaryProduct || slide?.primaryProduct,
                                    secondaryProducts: selectedSecondaryProducts.length > 0 ? selectedSecondaryProducts : (slide?.secondaryProducts || [])
                                };
                            }
                            return slide;
                        })}
                        currentSlide={currentSlide}
                        selectedSecondaryProducts={selectedSecondaryProducts}
                        onBackClick={() => setIsPreviewMode(false)}
                    />
                </>
            ) : (
                <>
                    <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                            Data Status: {slides.length > 0 ? `${slides.length} slides loaded` : 'No slides loaded'}
                            {slides[currentSlide] && ` | Current: "${slides[currentSlide].title || 'Untitled'}"`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Slide {currentSlide + 1} of 3
                        </Typography>
                    </Box>

                    <Tabs
                        value={currentSlide}
                        onChange={(e, newValue) => loadSlideData(slides[newValue], newValue)}
                        sx={{ mb: 3 }}
                    >
                        <Tab 
                            label={`Slide 1 ${slides[0]?.title ? '✓' : ''}`} 
                            sx={{ color: slides[0]?.primaryProduct ? 'green' : 'inherit' }}
                        />
                        <Tab 
                            label={`Slide 2 ${slides[1]?.title ? '✓' : ''}`}
                            sx={{ color: slides[1]?.primaryProduct ? 'green' : 'inherit' }}
                        />
                        <Tab 
                            label={`Slide 3 ${slides[2]?.title ? '✓' : ''}`}
                            sx={{ color: slides[2]?.primaryProduct ? 'green' : 'inherit' }}
                        />
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
                                    <ProductCard
                                        product={{
                                            ...selectedPrimaryProduct,
                                            images: selectedPrimaryProduct.images?.map(img => 
                                                typeof img === 'string' && img.includes('/') ? img : getImageUrl('products', img)
                                            ) || []
                                        }}
                                        getProductImage={getImageUrl}
                                        isPrimary={true}
                                        onRemove={() => handleRemoveProduct(selectedPrimaryProduct, true)}
                                    />
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

                                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                                    Secondary Products ({selectedSecondaryProducts.length}/3)
                                </Typography>
                                <Box display="flex" gap={2} flexWrap="wrap">
                                    {selectedSecondaryProducts.map((product) => (
                                        <ProductCard
                                            key={product._id}
                                            product={{
                                                ...product,
                                                images: product.images?.map(img => 
                                                    typeof img === 'string' && img.includes('/') ? img : getImageUrl('products', img)
                                                ) || []
                                            }}
                                            getProductImage={getImageUrl}
                                            onRemove={() => handleRemoveProduct(product)}
                                            compact
                                        />
                                    ))}
                                    {selectedSecondaryProducts.length < 3 && (
                                        <Button
                                            variant="outlined"
                                            onClick={() => {
                                                setSelectionMode('secondary');
                                                setShowProductSelection(true);
                                            }}
                                            sx={{ 
                                                height: '100%', 
                                                minHeight: 140,
                                                width: 160 
                                            }}
                                        >
                                            Add Secondary Product
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        )}

                        <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    // Reset current slide
                                    setTitle('');
                                    setSelectedCategory(null);
                                    setSelectedPrimaryProduct(null);
                                    setSelectedSecondaryProducts([]);
                                }}
                            >
                                Clear Slide
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    console.log('🔘 Save button clicked - disabled state check:', {
                                        saving,
                                        hasCategory: !!selectedCategory,
                                        hasPrimaryProduct: !!selectedPrimaryProduct,
                                        secondaryProductsCount: selectedSecondaryProducts.length,
                                        isDisabled: saving || !selectedCategory || !selectedPrimaryProduct || selectedSecondaryProducts.length !== 3
                                    });
                                    handleSaveSlide();
                                }}
                                disabled={saving || !selectedCategory || !selectedPrimaryProduct || selectedSecondaryProducts.length !== 3}
                            >
                                {saving ? 'Saving...' : `Save Slide ${currentSlide + 1}`}
                            </Button>
                        </Box>
                    </Paper>
                </>
            )}

            <ProductSelectionModal
                open={showProductSelection}
                onClose={() => setShowProductSelection(false)}
                products={categoryProducts}
                loading={loadingProducts}
                selectionMode={selectionMode}
                selectedPrimaryProduct={selectedPrimaryProduct}
                selectedSecondaryProducts={selectedSecondaryProducts}
                onProductSelect={handleProductSelect}
                page={page}
                totalPages={totalPages}
                onPageChange={fetchCategoryProducts}
                getProductImage={getImageUrl}
            />
        </Box>
    );
};

export default BannerManagement;
