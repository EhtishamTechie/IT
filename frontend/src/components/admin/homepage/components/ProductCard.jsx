import React from 'react';
import {
    Card,
    CardMedia,
    CardContent,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import { X } from 'lucide-react';
import { config } from '../../../../config';

const ProductCard = ({ 
    product, 
    getProductImage, 
    isPrimary = false, 
    onRemove, 
    compact = false 
}) => {
    if (!product) return null;

    return (
        <Card 
            sx={{ 
                position: 'relative',
                width: compact ? 160 : 200,
                height: compact ? 200 : 280,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <IconButton
                size="small"
                sx={{
                    position: 'absolute',
                    right: 4,
                    top: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)'
                    }
                }}
                onClick={() => onRemove && onRemove(product)}
            >
                <X fontSize="small" />
            </IconButton>

            <CardMedia
                component="img"
                height={compact ? "100" : "140"}
                image={getProductImage('products', product.image || (product.images?.[0] || null))}
                alt={product.name || 'Product'}
                sx={{ 
                    objectFit: 'contain', 
                    p: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    flex: '0 0 auto'
                }}
                onError={(e) => {
                    e.target.onerror = null; // Prevent infinite loop
                    e.target.parentElement.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.05);"><Typography variant="caption">Image not found</Typography></div>';
                }}
            />

            <CardContent sx={{ p: compact ? 1 : 2, flex: '1 1 auto' }}>
                <Typography 
                    variant={compact ? "body2" : "body1"} 
                    component="div" 
                    noWrap
                    title={product.name}
                >
                    {product.name}
                </Typography>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography 
                        variant={compact ? "caption" : "body2"} 
                        color="text.secondary"
                    >
                        {product.category?.name || ''}
                    </Typography>
                    <Typography 
                        variant={compact ? "body2" : "body1"} 
                        color="primary"
                    >
                        ${product.price?.toFixed(2)}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ProductCard;
