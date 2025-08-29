const handleSaveSlide = async () => {
    const validationErrors = [];
    
    if (!title?.trim()) validationErrors.push('Slide title is required');
    if (!selectedCategory?._id) validationErrors.push('Please select a category');
    if (!selectedPrimaryProduct?._id) validationErrors.push('Please select a primary product');
    if (selectedSecondaryProducts.length !== 3) validationErrors.push('Please select exactly 3 secondary products');

    if (validationErrors.length > 0) {
        toast.error(validationErrors.join('\n'));
        return;
    }

    const prevSlides = [...slides];
    setSaving(true);
    
    try {
        // Format a product with proper image paths
        const formatProduct = (product) => {
            if (!product) return null;

            const images = Array.isArray(product.images) 
                ? product.images 
                : [product.image || product.imagePath].filter(Boolean);

            const imagePath = product.image || product.imagePath || (images.length > 0 && images[0]);

            return {
                _id: product._id,
                title: product.title || '',
                price: product.price || 0,
                image: imagePath,
                imagePath: imagePath,
                images: images,
                category: product.category?._id || product.category || ''
            };
        };

        // Format current slide data
        const formattedSlideData = {
            title: title.trim(),
            category: selectedCategory._id,
            primaryProduct: formatProduct(selectedPrimaryProduct),
            secondaryProducts: selectedSecondaryProducts.map(formatProduct),
            order: currentSlide,
            image: selectedPrimaryProduct.image || selectedPrimaryProduct.imagePath || 
                   (selectedPrimaryProduct.images && selectedPrimaryProduct.images[0])
        };

        // Update slides array
        const updatedSlides = [...slides];
        updatedSlides[currentSlide] = formattedSlideData;

        // Clean and validate all slides for saving
        const validatedSlides = updatedSlides.map((slide, index) => ({
            ...slide,
            _id: slide._id,  // Preserve existing IDs
            order: index,
            title: slide.title || `Slide ${index + 1}`,
            category: slide.category || selectedCategory._id,
            primaryProduct: slide.primaryProduct || null,
            secondaryProducts: Array.isArray(slide.secondaryProducts) ? slide.secondaryProducts : []
        }));

        // Make API request
        const response = await API.put('/banner', { slides: validatedSlides });

        // Update local state
        setSlides(validatedSlides.map((slide, index) => ({
            ...slide,
            _id: index === currentSlide ? response.data._id : slide._id
        })));

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
