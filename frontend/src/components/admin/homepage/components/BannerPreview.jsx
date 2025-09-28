import React, { useState } from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getImageUrl } from '../../../../config';

const BannerPreview = ({ 
    slides, 
    currentSlide,
    onBackClick 
}) => {
    const activeSlide = slides[currentSlide];
    
    console.log('🎬 BannerPreview rendering:', {
        slidesCount: slides?.length,
        currentSlide,
        activeSlide: activeSlide ? {
            id: activeSlide._id,
            title: activeSlide.title,
            hasPrimaryProduct: !!activeSlide.primaryProduct,
            primaryProduct: activeSlide.primaryProduct ? {
                id: activeSlide.primaryProduct._id,
                title: activeSlide.primaryProduct.title,
                name: activeSlide.primaryProduct.name,
                image: activeSlide.primaryProduct.image,
                images: activeSlide.primaryProduct.images
            } : null,
            secondaryProductsCount: activeSlide.secondaryProducts?.length || 0,
            secondaryProducts: activeSlide.secondaryProducts?.map(p => ({
                id: p._id,
                title: p.title,
                name: p.name,
                image: p.image,
                images: p.images
            }))
        } : null
    });
    
    if (!activeSlide) {
        return (
            <Paper sx={{ p: 3 }}>
                <Box mb={2} display="flex" alignItems="center">
                    <IconButton onClick={onBackClick} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">Banner Preview</Typography>
                </Box>
                <Typography color="text.secondary" align="center">
                    No slide data available
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Box mb={2} display="flex" alignItems="center">
                <IconButton onClick={onBackClick} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6">Banner Preview</Typography>
            </Box>

            {/* Title */}
            <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4 }}>
                {activeSlide.title || 'Untitled Banner'}
            </Typography>

            {/* Product Grid */}
            <Box display="grid" gap={2} sx={{
                gridTemplateColumns: '2fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                height: '500px',
                '@media (max-width: 960px)': {
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: 'auto auto',
                    height: 'auto',
                    '& .primary-product': {
                        gridColumn: 'span 2'
                    }
                }
            }}>
                {/* Primary Product - Large Display */}
                {activeSlide.primaryProduct && (
                    <Box 
                        className="primary-product"
                        sx={{
                            gridColumn: '1',
                            gridRow: 'span 3',
                            position: 'relative',
                            minHeight: '400px',
                            '@media (max-width: 960px)': {
                                minHeight: '300px',
                                gridRow: 'span 1'
                            }
                        }}
                    >
                        <PreviewImage
                            imageUrl={getImageUrl('products', activeSlide.primaryProduct.image || (activeSlide.primaryProduct.images?.[0] || 'placeholder.jpg'))}
                            alt={activeSlide.primaryProduct.title || activeSlide.primaryProduct.name}
                            title={activeSlide.primaryProduct.title || activeSlide.primaryProduct.name}
                            price={activeSlide.primaryProduct.price}
                            large={true}
                        />
                    </Box>
                )}

                {/* Secondary Products - Smaller Display */}
                {activeSlide.secondaryProducts?.slice(0, 3).map((product, index) => (
                    <Box
                        key={product._id || index}
                        sx={{
                            gridColumn: '2 / span 1',
                            gridRow: `${index + 1}`,
                            position: 'relative',
                            minHeight: '160px',
                            '@media (max-width: 960px)': {
                                gridColumn: index === 0 ? '1' : '2',
                                gridRow: index === 0 ? '2' : index === 1 ? '2' : '3',
                                minHeight: '140px'
                            }
                        }}
                    >
                        <PreviewImage
                            imageUrl={getImageUrl('products', product.image || (product.images?.[0] || 'placeholder.jpg'))}
                            alt={product.title || product.name}
                            title={product.title || product.name}
                            price={product.price}
                            large={false}
                        />
                    </Box>
                ))}

                {/* Fill empty secondary product slots */}
                {[...Array(Math.max(0, 3 - (activeSlide.secondaryProducts?.length || 0)))].map((_, index) => (
                    <Box
                        key={`empty-${index}`}
                        sx={{
                            gridColumn: '2 / span 1',
                            gridRow: `${(activeSlide.secondaryProducts?.length || 0) + index + 1}`,
                            minHeight: '160px',
                            backgroundColor: '#f5f5f5',
                            border: '2px dashed #ddd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1,
                            '@media (max-width: 960px)': {
                                minHeight: '140px'
                            }
                        }}
                    >
                        <Typography color="text.secondary" variant="body2">
                            Secondary Product {(activeSlide.secondaryProducts?.length || 0) + index + 1}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

const PreviewImage = ({ imageUrl, alt, title, price, large = false }) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    console.log('🖼️ PreviewImage rendering:', { imageUrl, alt, title, price, large });

    const handleImageError = (e) => {
        console.warn('❌ Image failed to load:', imageUrl);
        setImageError(true);
        e.target.style.display = 'none';
    };

    const handleImageLoad = () => {
        console.log('✅ Image loaded successfully:', imageUrl);
        setImageLoaded(true);
    };

    return (
        <Box
            sx={{
                position: 'relative',
                height: '100%',
                width: '100%',
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover .overlay': {
                    opacity: 1
                }
            }}
        >
            {imageError || !imageUrl ? (
                <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        No Image Available
                    </Typography>
                    {title && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {title}
                        </Typography>
                    )}
                    {price && (
                        <Typography variant="body2" color="primary">
                            ${price?.toFixed(2)}
                        </Typography>
                    )}
                </Box>
            ) : (
                <>
                    <Box
                        component="img"
                        src={imageUrl}
                        alt={alt}
                        sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: large ? 'contain' : 'cover',
                            display: imageError ? 'none' : 'block'
                        }}
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                    />
                    <Box
                        className="overlay"
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            p: large ? 2 : 1,
                            opacity: 0,
                            transition: 'opacity 0.3s'
                        }}
                    >
                        <Typography 
                            variant={large ? 'h6' : 'body2'} 
                            noWrap
                            sx={{ mb: large ? 1 : 0.5 }}
                        >
                            {title}
                        </Typography>
                        <Typography variant={large ? 'body1' : 'body2'}>
                            ${price?.toFixed(2)}
                        </Typography>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default BannerPreview;
