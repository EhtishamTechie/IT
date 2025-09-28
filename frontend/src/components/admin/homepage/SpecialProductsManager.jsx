
import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import { Preview as PreviewIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import CategorySelector from './CategorySelector';
import ProductSelectionModal from './ProductSelectionModal';
import { toast } from 'react-toastify';
import axios from 'axios';
import { config, getApiUrl, getImageUrl } from '../../../config';

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    overflowY: 'auto'
};

const getProductImage = (product) => {
    if (!product) return null;
    // Try different image fields in order of preference
    if (Array.isArray(product.images) && product.images.length > 0) {
        return product.image || product.images[0];
    }
    if (product.image) {
        return product.image;
    }
    return null;
};

const SpecialProductsManager = ({ type }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 20;

    const endpoint = type === 'featured' ? 'special/featured' : 'special/premium';
    const title = type === 'featured' ? 'Featured Products' : 'Premium Products';

    // Cache for optimizing requests
    const cache = useRef({
        selectedProducts: { data: null, timestamp: 0 },
        categoryProducts: { data: null, timestamp: 0, category: null, page: null }
    });

    // Load initial data
    useEffect(() => {
        loadSelectedProducts();
    }, []);

    // Load category products when category or page changes
    useEffect(() => {
        if (selectedCategory) {
            loadCategoryProducts();
        }
    }, [selectedCategory, page]);

    const loadSelectedProducts = async () => {
        // Check cache (valid for 30 seconds)
        const now = Date.now();
        if (cache.current.selectedProducts.data && 
            now - cache.current.selectedProducts.timestamp < 30000) {
            setSelectedProducts(cache.current.selectedProducts.data);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(getApiUrl(endpoint), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = response.data || [];
            
            // Update cache
            cache.current.selectedProducts = {
                timestamp: now,
                data: data
            };
            
            setSelectedProducts(data);
        } catch (error) {
            const message = error.response?.data?.message || 'Error loading selected products';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const loadCategoryProducts = async () => {
        if (!selectedCategory) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.get(getApiUrl('products'), {
                params: {
                    category: selectedCategory.name,
                    isActive: true,
                    page,
                    limit: PAGE_SIZE,
                    populate: ['category']
                }
            });

            // Filter out already selected products
            const availableProducts = (response.data.products || []).filter(product => 
                !selectedProducts.some(sp => sp._id === product._id)
            );

            setCategoryProducts(availableProducts);
            setTotalPages(Math.ceil(response.data.totalProducts / PAGE_SIZE));
        } catch (error) {
            const message = error.response?.data?.message || 'Error loading category products';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = async (categoryId) => {
        console.log('🏷️ [SPECIAL PRODUCTS] Category selected:', categoryId);
        if (!categoryId) {
            setSelectedCategory(null);
            setCategoryProducts([]);
            return;
        }

        // Reset pagination when changing category
        setPage(1);
        setLoading(true);
        setError(null);
        
        try {
            // First, get the category details
            const categoryResponse = await axios.get(getApiUrl(`categories/${categoryId}`));
            setSelectedCategory(categoryResponse.data);

            // Products will be loaded by the useEffect watching selectedCategory and page
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Error loading category';
            setError(message);
            toast.error(message);
            setSelectedCategory(null);
            setCategoryProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (product) => {
        // Optimistic update
        const updatedProducts = [...selectedProducts, product];
        setSelectedProducts(updatedProducts);
        setCategoryProducts(prev => prev.filter(p => p._id !== product._id));

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                getApiUrl(endpoint), 
                { productIds: updatedProducts.map(p => p._id) },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // Update cache
            cache.current.selectedProducts = {
                data: updatedProducts,
                timestamp: Date.now()
            };

            toast.success(`Product added to ${title} successfully`);
        } catch (error) {
            // Rollback on error
            setSelectedProducts(selectedProducts);
            setCategoryProducts(prev => [...prev, product]);
            console.error('Error adding product:', error);
            toast.error(error.response?.data?.message || 'Error adding product');
        }
    };

    const handleRemoveProduct = async (productId) => {
        // Optimistic update
        const updatedProducts = selectedProducts.filter(p => p._id !== productId);
        const removedProduct = selectedProducts.find(p => p._id === productId);
        
        setSelectedProducts(updatedProducts);
        if (selectedCategory && removedProduct) {
            setCategoryProducts(prev => [...prev, removedProduct]);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                getApiUrl(endpoint),
                { productIds: updatedProducts.map(p => p._id) },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // Update cache
            cache.current.selectedProducts = {
                data: updatedProducts,
                timestamp: Date.now()
            };

            toast.success('Product removed successfully');
        } catch (error) {
            // Rollback on error
            setSelectedProducts(selectedProducts);
            if (selectedCategory && removedProduct) {
                setCategoryProducts(prev => prev.filter(p => p._id !== productId));
            }
            toast.error('Error removing product');
            console.error('Error:', error);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3, color: 'error.main' }}>
                <Typography>{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Manage {title}
            </Typography>

            {/* Category Selection */}
            <Box sx={{ mb: 4 }}>
                <CategorySelector onCategoryChange={handleCategoryChange} />
            </Box>

            {/* Selected Products Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Selected Products ({selectedProducts.length})
                    </Typography>
                    <Button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        startIcon={<PreviewIcon />}
                    >
                        {isPreviewMode ? 'Exit Preview' : 'Preview Layout'}
                    </Button>
                </Box>

                {!isPreviewMode ? (
                    <Grid container spacing={2}>
                        {selectedProducts.map((product) => (
                            <Grid key={product._id} gridColumn={{ xs: "span 12", sm: "span 6", md: "span 3" }}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardMedia
                                    component="img"
                                    sx={{
                                        height: 200,
                                        objectFit: 'cover'
                                    }}
                                    image={getImageUrl('products', getProductImage(product))}
                                    alt={product.title}
                                    onError={(e) => {
                                        console.log('🖼️ Image load failed:', product.title, getProductImage(product));
                                        e.target.onerror = null;
                                        e.target.src = '/assets/no-image.png';
                                    }}
                                />
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="body1" noWrap>
                                        {product.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        ${product.price}
                                    </Typography>
                                </CardContent>
                                <Box sx={{ p: 1 }}>
                                    <Button 
                                        fullWidth 
                                        variant="outlined" 
                                        color="error"
                                        onClick={() => handleRemoveProduct(product._id)}
                                    >
                                        Remove
                                    </Button>
                                </Box>
                            </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : null}
            </Box>

            {/* Products Selection Section */}
            {selectedCategory && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Available Products in {selectedCategory.name}
                    </Typography>
                    
                    <Box sx={{ position: 'relative' }}>
                        {loading && (
                            <Box 
                                sx={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    right: 0, 
                                    bottom: 0, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                                    zIndex: 1
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        )}
                        <Grid container spacing={2}>
                            {categoryProducts.map((product) => (
                                <Grid 
                                    key={product._id} 
                                    sx={{ 
                                        gridColumn: { 
                                            xs: 'span 12', 
                                            sm: 'span 6', 
                                            md: 'span 4', 
                                            lg: 'span 2' 
                                        } 
                                    }}
                                >
                                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <CardMedia
                                            component="img"
                                            sx={{
                                                height: 160,
                                                objectFit: 'cover',
                                                background: '#f5f5f5'
                                            }}
                                            image={getImageUrl('products', getProductImage(product))}
                                            alt={product.title}
                                            onError={(e) => {
                                                console.log('🖼️ Image load failed:', product.image || product.images?.[0]);
                                                e.target.onerror = null;
                                                e.target.src = '/assets/no-image.png';
                                            }}
                                            loading="lazy"
                                        />
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Typography variant="body1" noWrap>
                                                {product.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                ${product.price}
                                            </Typography>
                                            {product.stock > 0 && (
                                                <Typography variant="caption" color="success.main">
                                                    In Stock ({product.stock})
                                                </Typography>
                                            )}
                                        </CardContent>
                                        <Box sx={{ p: 1 }}>
                                            <Button 
                                                fullWidth 
                                                variant="contained"
                                                onClick={() => handleAddProduct(product)}
                                                disabled={loading}
                                                sx={{
                                                    '&.Mui-disabled': {
                                                        bgcolor: 'rgba(25, 118, 210, 0.7)',
                                                        color: 'white'
                                                    }
                                                }}
                                            >
                                                {loading ? 'Adding...' : `Add to ${title}`}
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(e, value) => setPage(value)}
                                color="primary"
                                disabled={loading}
                                siblingCount={1}
                                boundaryCount={1}
                            />
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default SpecialProductsManager;
