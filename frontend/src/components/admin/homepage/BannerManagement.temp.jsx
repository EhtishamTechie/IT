import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    CircularProgress,
    Grid,
    IconButton,
    Modal,
    Pagination,
    Paper,
    Tab,
    Tabs,
    TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';
import { toast } from 'react-toastify';
import { getApiUrl, getImageUrl } from '../../../utils/api';
import CategorySelector from './CategorySelector';
import BannerPreview from './BannerPreview';

const CACHE_DURATION = 30000; // 30 seconds
const PAGE_SIZE = 12;

const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '1200px',
    height: '550px',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 2,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
};

const getProductImage = (product) => {
    if (!product) return null;
    
    if (Array.isArray(product.images) && product.images.length > 0) {
        const image = product.image || product.images[0];
        return typeof image === 'string' ? getImageUrl('products', image) : null;
    }
    
    if (product.image) {
        return typeof product.image === 'string' ? getImageUrl('products', product.image) : null;
    }
    
    if (product.imagePath) {
        return getImageUrl('products', product.imagePath);
    }
    
    return null;
};

const BannerManagement = () => {
    // State declarations
    const [slides, setSlides] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPrimaryProduct, setSelectedPrimaryProduct] = useState(null);
    const [selectedSecondaryProducts, setSelectedSecondaryProducts] = useState([]);
    const [showProductSelection, setShowProductSelection] = useState(false);
    const [selectionMode, setSelectionMode] = useState('primary');
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const cache = useRef({
        bannerData: { data: null, timestamp: 0 },
        categoryProducts: { data: null, timestamp: 0, category: null, page: null }
    });

    // Effects
    useEffect(() => {
        fetchBannerData();
    }, []);

    useEffect(() => {
        if (selectedCategory && selectedCategory._id) {
            fetchCategoryProducts(page);
        }
    }, [selectedCategory, page]);

    useEffect(() => {
        if (slides[currentSlide]) {
            loadSlideData(slides[currentSlide], currentSlide);
        }
    }, [currentSlide]);

    // Add your existing function implementations here
    
    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Add your existing JSX here */}
        </Box>
    );
};

export default BannerManagement;
