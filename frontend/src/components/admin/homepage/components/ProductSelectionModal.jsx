import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Grid,
    Typography,
    CircularProgress,
    Pagination,
    TextField,
    InputAdornment,
    IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ProductCard from './ProductCard';
import { getImageUrl } from '../../../../config';

const ProductSelectionModal = ({
    open,
    onClose,
    products = [],
    loading,
    selectionMode,
    selectedPrimaryProduct,
    selectedSecondaryProducts = [],
    onProductSelect,
    page = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const isProductSelected = (product) => {
        if (!product) return false;
        
        if (selectionMode === 'primary') {
            return selectedPrimaryProduct?._id === product._id;
        } else {
            return selectedSecondaryProducts.some(p => p._id === product._id);
        }
    };

    const handleProductClick = (product) => {
        if (isProductSelected(product)) return;
        onProductSelect(product);
    };

    // Filter products based on search term
    const filteredProducts = searchTerm
        ? products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : products;

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }
            }}
        >
            <DialogTitle sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                pb: 2
            }}>
                <Typography variant="h6">
                    Select {selectionMode === 'primary' ? 'Primary' : 'Secondary'} Product
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column' }}>
                {/* Search Box */}
                <Box sx={{ py: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="outlined"
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchTerm && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : filteredProducts.length === 0 ? (
                    <Typography align="center" py={4}>
                        {searchTerm ? 'No matching products found' : 'No products found in this category'}
                    </Typography>
                ) : (
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            {filteredProducts.map((product) => (
                                <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
                                    <Box
                                        onClick={() => handleProductClick(product)}
                                        sx={{
                                            cursor: isProductSelected(product) ? 'default' : 'pointer',
                                            opacity: isProductSelected(product) ? 0.6 : 1,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                transform: isProductSelected(product) ? 'none' : 'scale(1.02)'
                                            }
                                        }}
                                    >
                                        <ProductCard
                                            product={product}
                                            getProductImage={getImageUrl}
                                        />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>

                        {totalPages > 1 && (
                            <Box 
                                display="flex" 
                                justifyContent="space-between" 
                                alignItems="center"
                                borderTop="1px solid rgba(0, 0, 0, 0.12)"
                                pt={2}
                                pb={1}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Showing {filteredProducts.length} products
                                    {searchTerm && ` matching "${searchTerm}"`}
                                </Typography>
                                
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(e, value) => onPageChange(value)}
                                    color="primary"
                                    size="small"
                                />
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ProductSelectionModal;
