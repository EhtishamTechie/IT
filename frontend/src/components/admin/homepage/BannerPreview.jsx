import React from 'react';
import {
    Box,
    Typography,
    Card,
    IconButton,
} from '@mui/material';

import { getImageUrl, config } from '../../../config';

const getProductImage = (product) => {
    const PLACEHOLDER_URL = `${config.UPLOADS_URL}/placeholder-product.jpg`;
    
    if (!product) {
        console.log('⚠️ No product provided to getProductImage');
        return PLACEHOLDER_URL;
    }
    
    try {
        // If product already has a full URL in image or imagePath, use it directly
        if (product.image && product.image.startsWith('http')) {
            return product.image;
        }
        
        if (product.imagePath && product.imagePath.startsWith('http')) {
            return product.imagePath;
        }
        
        // If product has a pre-processed image URL
        if (product.image) {
            return product.image;
        }
        
        // If product has a pre-processed imagePath
        if (product.imagePath) {
            return product.imagePath;
        }
        
        // If product has images array
        if (Array.isArray(product.images) && product.images.length > 0) {
            return product.image || product.images[0];
        }

        // Log product data for debugging
        console.log('🔍 Processing product object:', {
            id: product._id,
            title: product.title,
            image: product.image,
            hasImages: Array.isArray(product.images),
            imagesLength: product.images?.length
        });

        // If product has a direct image property
        if (product.image) {
            const imageUrl = getImageUrl('products', product.image);
            console.log('📸 Using product.image:', { image: product.image, generatedUrl: imageUrl });
            return imageUrl;
        }

        // If product is an object, check for images array
        if (Array.isArray(product.images) && product.images.length > 0) {
            const primaryImage = product.image || product.images[0];
            const imageUrl = getImageUrl('products', primaryImage);
            console.log('📸 Using primary image:', { image: primaryImage, generatedUrl: imageUrl });
            return imageUrl;
        }

        // If product has imagePath
        if (product.imagePath) {
            const imageUrl = getImageUrl('products', product.imagePath);
            console.log('📸 Using imagePath:', { imagePath: product.imagePath, generatedUrl: imageUrl });
            return imageUrl;
        }

        console.warn('❌ No valid image found:', product);
    } catch (error) {
        console.error('🚫 Error generating image URL:', error);
    }
    
    return '/placeholder-product.jpg';
};

const BannerPreview = ({ slides = [], onBackClick }) => {
    console.log('� Detailed Product Analysis:', slides.map(slide => ({
        primaryProduct: slide.primaryProduct ? {
            id: slide.primaryProduct._id,
            title: slide.primaryProduct.title,
            image: slide.primaryProduct.image,
            imagePath: slide.primaryProduct.imagePath,
            hasImages: Array.isArray(slide.primaryProduct.images),
            imagesCount: Array.isArray(slide.primaryProduct.images) ? slide.primaryProduct.images.length : 0,
            allFields: Object.keys(slide.primaryProduct)
        } : null,
        secondaryProducts: Array.isArray(slide.secondaryProducts) ? 
            slide.secondaryProducts.map(p => p ? {
                id: p._id,
                title: p.title,
                image: p.image,
                imagePath: p.imagePath,
                hasImages: Array.isArray(p.images),
                imagesCount: Array.isArray(p.images) ? p.images.length : 0,
                allFields: Object.keys(p)
            } : 'null') : 'not an array'
    })));

    console.log('�🚀 BannerPreview received slides:', slides.map(slide => ({
        id: slide._id,
        title: slide.title,
        hasCategory: !!slide.category,
        categoryName: slide.category?.name,
        hasPrimaryProduct: !!slide.primaryProduct,
        primaryProductTitle: slide.primaryProduct?.title,
        secondaryProductsCount: Array.isArray(slide.secondaryProducts) ? slide.secondaryProducts.length : 0,
        secondaryProducts: Array.isArray(slide.secondaryProducts) ? 
            slide.secondaryProducts.map(p => ({
                id: p?._id,
                title: p?.title,
                hasImage: p ? (!!p.image || (Array.isArray(p.images) && p.images.length > 0)) : false
            })) : 'not an array'
    })));

    const renderSecondaryProduct = (product, index, slide) => {
        console.log('🎯 Rendering secondary product:', { 
            product,
            index,
            slideTitle: slide?.title,
            productDetails: product ? {
                id: product._id,
                title: product.title,
                hasImage: !!product.image,
                hasImagePath: !!product.imagePath,
                image: product.image,
                imagePath: product.imagePath,
                hasImages: Array.isArray(product.images),
                imagesCount: Array.isArray(product.images) ? product.images.length : 0,
                allFields: Object.keys(product)
            } : 'no product',
            slideSecondaryProducts: Array.isArray(slide?.secondaryProducts) ? 
                slide.secondaryProducts.map(p => ({
                    id: p?._id || 'no id',
                    hasProduct: !!p,
                    hasImage: p ? !!p.image || !!p.imagePath : false
                })) : 'not an array',
            allSlideKeys: Object.keys(slide || {})
        });

        if (!product) {
            console.log('⚠️ No product data provided for index:', index);
            return (
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f8f9fa',
                    border: '1px solid #eee',
                    borderRadius: 1,
                    p: 1
                }}>
                    <Typography color="text.secondary" variant="body2">
                        No Product Selected
                    </Typography>
                </Box>
            );
        }

        // Get the image URL carefully handling different data structures
        const imageUrl = getProductImage(product);
        console.log('🖼️ Image URL for secondary product:', {
            index,
            imageUrl,
            productDetails: {
                id: product._id,
                title: product.title,
                rawImage: product.image,
                rawImagePath: product.imagePath,
                hasImages: Array.isArray(product.images),
                imagesLength: product.images?.length,
                primaryImage: product.image,
                firstImageFromArray: product.images?.[0],
                allFields: Object.keys(product)
            }
        });

        return (
            <Box sx={{ 
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 1,
                bgcolor: '#f8f9fa',
                display: 'flex',
                flexDirection: 'column',
                p: 1,
                border: '1px solid #eee'
            }}>
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    maxHeight: 200, // Limit the height to maintain consistent sizes
                    minHeight: 120  // Ensure minimum height for small images
                }}>
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={product?.title || `Secondary Image ${index + 1}`}
                        sx={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            transition: 'transform 0.2s ease-in-out',
                            '&:hover': {
                                transform: 'scale(1.05)'
                            }
                        }}
                        onError={(e) => {
                            console.warn('Unable to load image, using placeholder', {
                                product,
                                imageUrl
                            });
                            e.target.onerror = null; // Prevent infinite loop
                            if (!imageUrl.includes('placeholder-product.jpg')) {
                                e.target.src = `${config.UPLOADS_URL}/placeholder-product.jpg`;
                            }
                        }}
                    />
                </Box>
                {product?.title && (
                    <Box sx={{ mt: 1, textAlign: 'center' }}>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                color: 'text.secondary',
                                fontWeight: 500,
                                mb: 0.5
                            }}
                        >
                            {product.title}
                        </Typography>
                        {product.price && (
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: 'primary.main',
                                    fontWeight: 600
                                }}
                            >
                                ${product.price.toFixed(2)}
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        );
};
    return (
        <Box sx={{ backgroundColor: '#f5f5f5', p: 3, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton onClick={onBackClick}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" ml={1}>Banner Preview</Typography>
            </Box>

            {slides.map((slide, index) => (
                <Card key={index} sx={{ mb: 4, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                        <Typography variant="h6" color="primary">
                            {slide.title || `Slide ${index + 1}`}
                        </Typography>
                        {slide.category && (
                            <Typography variant="subtitle2" color="text.secondary">
                                Category: {slide.category.name || 'Unknown Category'}
                            </Typography>
                        )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', minHeight: 400 }}>
                        {/* Primary Product Side */}
                        <Box sx={{ 
                            flex: '0 0 65%',
                            p: 2,
                            bgcolor: '#fff',
                            borderRight: '1px solid #eee',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <Box sx={{ 
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative'
                            }}>
                                {slide.primaryProduct ? (
                                    <Box
                                        component="img"
                                        src={getProductImage(slide.primaryProduct)}
                                        alt={slide.primaryProduct.title || 'Primary Product'}
                                        sx={{
                                            maxWidth: '300px',
                                            maxHeight: '300px',
                                            objectFit: 'contain',
                                            width: 'auto',
                                            height: 'auto',
                                            margin: 'auto'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null; // Prevent infinite loop
                                            const placeholderUrl = `${config.UPLOADS_URL}/placeholder-product.jpg`;
                                            if (e.target.src !== placeholderUrl) {
                                                e.target.src = placeholderUrl;
                                            }
                                        }}
                                    />
                                ) : slide.image ? (
                                    <Box
                                        component="img"
                                        src={getImageUrl('products', slide.image)}
                                        alt={slide.title || 'Banner Image'}
                                        sx={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain'
                                        }}
                                        onError={(e) => {
                                            console.error('Failed to load image:', slide.image);
                                            e.target.onerror = null;
                                            e.target.src = '/placeholder-product.jpg';
                                        }}
                                    />
                                ) : (
                                    <Typography color="text.secondary">
                                        No Image Selected
                                    </Typography>
                                )}
                            </Box>
                            {slide.primaryProduct && (
                                <Box sx={{ mt: 2, textAlign: 'center' }}>
                                    <Typography variant="subtitle1">
                                        {slide.primaryProduct.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        ${slide.primaryProduct.price}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Secondary Products Side */}
                        <Box sx={{ 
                            flex: '0 0 35%',
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}>
                            {console.log('🎬 Rendering secondary products section:', {
                                slideId: slide._id,
                                slideTitle: slide.title,
                                hasSecondaryProducts: !!slide.secondaryProducts,
                                secondaryProductsType: Array.isArray(slide.secondaryProducts) ? 'array' : typeof slide.secondaryProducts,
                                secondaryProductsLength: Array.isArray(slide.secondaryProducts) ? slide.secondaryProducts.length : 'N/A',
                                rawSecondaryProducts: slide.secondaryProducts
                            })}
                            {[0, 1, 2].map((idx) => {
                                const product = slide.secondaryProducts?.[idx];
                                console.log(`📦 Secondary product ${idx}:`, {
                                    exists: !!product,
                                    type: typeof product,
                                    id: product?._id,
                                    title: product?.title,
                                    hasImage: product ? (!!product.image || (Array.isArray(product.images) && product.images.length > 0)) : false
                                });
                                return (
                                    <div key={`secondary-${idx}`}>
                                        {renderSecondaryProduct(
                                            slide.secondaryProducts?.[idx],
                                            idx,
                                            slide
                                        )}
                                    </div>
                                );
                            })}
                        </Box>
                    </Box>
                </Card>
            ))}

            {slides.length === 0 && (
                <Box sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    bgcolor: '#fff',
                    borderRadius: 1
                }}>
                    <Typography color="text.secondary">
                        No slides available. Create a slide to preview it here.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default BannerPreview;
