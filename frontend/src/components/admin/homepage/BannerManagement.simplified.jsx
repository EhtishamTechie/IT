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
    IconButton,
    TextField,
    Tabs,
    Tab,
    Paper,
    Grid,
    Modal,
    Pagination
} from '@mui/material';


import { toast } from 'react-toastify';
import axios from 'axios';
import { getApiUrl } from '../../../config';

const BannerManagement = () => {
    // State declarations remain the same...

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

            // Format helper functions
            const formatId = (item) => {
                if (!item) return null;
                if (typeof item === 'string') return item;
                if (item._id) return item._id;
                return null;
            };

            // Format data
            const formattedTitle = title.trim();
            const formattedCategory = formatId(selectedCategory);
            const formattedPrimaryProduct = formatId(selectedPrimaryProduct);
            
            // Format secondary products
            const formattedSecondaryProducts = selectedSecondaryProducts.map(product => ({
                _id: formatId(product),
                title: product.title || 'Secondary Product',
                price: product.price || 0,
                image: product.image || product.imagePath,
                images: Array.isArray(product.images) ? product.images : [product.image || product.imagePath].filter(Boolean)
            }));

            // Extract image from primary product
            const slideImage = selectedPrimaryProduct?.image || selectedPrimaryProduct?.images?.[0] || 'default-banner.jpg';

            // Validate all required fields
            if (!formattedTitle || !formattedCategory || !formattedPrimaryProduct || formattedSecondaryProducts.length !== 3) {
                const missing = [];
                if (!formattedTitle) missing.push('title');
                if (!formattedCategory) missing.push('category');
                if (!formattedPrimaryProduct) missing.push('primary product');
                if (formattedSecondaryProducts.length !== 3) missing.push('3 secondary products');
                throw new Error(`Missing required fields: ${missing.join(', ')}`);
            }

            // Create request data
            const requestData = {
                slides: slides.map((slide, index) => {
                    if (index === currentSlide) {
                        // Return the new data for current slide
                        return {
                            title: formattedTitle,
                            category: formattedCategory,
                            primaryProduct: formattedPrimaryProduct,
                            secondaryProducts: formattedSecondaryProducts.map(p => p._id),
                            order: index,
                            image: slideImage
                        };
                    }
                    // Return existing data for other slides
                    return {
                        title: slide.title || 'Untitled Slide',
                        category: slide.category?._id || slide.category || null,
                        primaryProduct: slide.primaryProduct?._id || slide.primaryProduct || null,
                        secondaryProducts: slide.secondaryProducts?.map(p => p._id || p) || [],
                        order: index,
                        image: slide.image || '/placeholder-banner.jpg'
                    };
                })
            };

            // Make API call
            const response = await axios.put(
                getApiUrl('api/homepage/banners'),
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Validate response
            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid server response');
            }

            // Update local state
            const updatedSlides = slides.map((slide, index) => {
                if (index === currentSlide) {
                    return {
                        ...slide,
                        title: formattedTitle,
                        category: selectedCategory,
                        primaryProduct: selectedPrimaryProduct,
                        secondaryProducts: formattedSecondaryProducts,
                        image: slideImage,
                        secondaryImage1: selectedSecondaryProducts[0]?.image || selectedSecondaryProducts[0]?.images?.[0] || null,
                        secondaryImage2: selectedSecondaryProducts[1]?.image || selectedSecondaryProducts[1]?.images?.[0] || null,
                        secondaryImage3: selectedSecondaryProducts[2]?.image || selectedSecondaryProducts[2]?.images?.[0] || null
                    };
                }
                return slide;
            });

            // Update state and cache
            setSlides(updatedSlides);
            cache.current.bannerData = {
                data: updatedSlides,
                timestamp: Date.now()
            };

            toast.success('Slide saved successfully');

        } catch (error) {
            // Rollback on error
            setSlides(prevSlides);
            
            console.error('Error saving slide:', {
                response: error.response?.data,
                status: error.response?.status,
                message: error.message
            });
            
            // Handle specific error cases
            if (error.message === 'Authentication required' || error.response?.status === 401) {
                toast.error('Please log in again to continue.');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('token');
                return;
            }
            
            if (error.response?.status === 500) {
                toast.error(error.response?.data?.message || 'Server error occurred. Please try again.');
                return;
            }
            
            if (!navigator.onLine) {
                toast.error('Network connection lost. Please check your internet connection and try again.');
                return;
            }
            
            toast.error(error.response?.data?.message || error.message || 'Failed to save slide. Please try again.');
            
            // Clear cache to force fresh data on next load
            cache.current.bannerData = {
                data: null,
                timestamp: 0
            };
        } finally {
            setSaving(false);
        }
    };

    // Rest of component implementation...
}
