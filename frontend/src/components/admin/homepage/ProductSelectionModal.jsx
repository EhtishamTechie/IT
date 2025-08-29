import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { getImageUrl } from '../../../config';

const ProductSelectionModal = ({ open, onClose, products = [], selectedProducts = [], onSave, onLoadMore }) => {
    const [localSelectedProducts, setLocalSelectedProducts] = React.useState(selectedProducts);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        setLocalSelectedProducts(selectedProducts);
    }, [selectedProducts]);

    React.useEffect(() => {
        const handleScroll = async () => {
            if (!containerRef.current || loading) return;
            
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight - scrollTop <= clientHeight * 1.5) {
                setLoading(true);
                if (onLoadMore) {
                    await onLoadMore();
                }
                setLoading(false);
            }
        };

        const currentRef = containerRef.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener('scroll', handleScroll);
            }
        };
    }, [loading, onLoadMore]);

    const handleToggleProduct = (product) => {
        setLocalSelectedProducts(prev => {
            const isSelected = prev.some(p => p._id === product._id);
            if (isSelected) {
                return prev.filter(p => p._id !== product._id);
            } else {
                return [...prev, product];
            }
        });
    };

    const handleSave = () => {
        onSave(localSelectedProducts.map(p => p._id));
        onClose();
    };

    const isProductSelected = (productId) => {
        return localSelectedProducts.some(p => p._id === productId);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Select Products</DialogTitle>
            <DialogContent ref={containerRef} sx={{ p: 3 }}>
                <Box sx={{ 
                    mb: 2, 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 1, 
                    bgcolor: 'background.paper',
                    py: 1
                }}>
                    <Typography variant="body2" color="text.secondary">
                        Selected: {localSelectedProducts.length} products
                    </Typography>
                </Box>
                {error && (
                    <Box sx={{ width: '100%', p: 2, textAlign: 'center' }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                )}
                
                <Grid container spacing={2}>
                    {Array.isArray(products) && products.map((product) => (
                        <Grid item xs={12} sm={6} md={3} key={product._id}>
                            <Card sx={{ height: '100%' }}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        height: 200,
                                        bgcolor: 'grey.100'
                                    }}
                                >
                                    <CardMedia
                                        component="img"
                                        sx={{
                                            height: '100%',
                                            objectFit: 'contain',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%'
                                        }}
                                        image={product.images && product.images.length > 0 
                                            ? getImageUrl('products', product.images[0])
                                            : '/assets/no-image.png'
                                        }
                                        alt={product.name}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/assets/no-image.png';
                                        }}
                                    />
                                </Box>
                                <CardContent>
                                    <Typography variant="body1" noWrap>
                                        {product.name}
                                    </Typography>
                                    <Button
                                        fullWidth
                                        variant={isProductSelected(product._id) ? "contained" : "outlined"}
                                        color={isProductSelected(product._id) ? "error" : "primary"}
                                        onClick={() => handleToggleProduct(product)}
                                        sx={{ mt: 1 }}
                                    >
                                        {isProductSelected(product._id) ? "Remove" : "Select"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    
                    {loading && (
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress />
                            </Box>
                        </Grid>
                    )}
                    
                    {!loading && Array.isArray(products) && products.length === 0 && (
                        <Grid item xs={12}>
                            <Box sx={{ textAlign: 'center', p: 3 }}>
                                <Typography variant="body1" color="text.secondary">
                                    No products found in this category
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSave}
                        disabled={loading}
                    >
                        Save Selection
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ProductSelectionModal;
