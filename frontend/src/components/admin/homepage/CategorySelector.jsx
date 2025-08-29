import React, { useState, useEffect } from 'react';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import axios from 'axios';
import { getApiUrl } from '../../../config';
import { toast } from 'react-toastify';

const CategorySelector = ({ onCategoryChange }) => {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get(getApiUrl('categories'));
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast.error('Failed to load categories');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    const handleChange = (event) => {
        const categoryId = event.target.value;
        const selectedCat = categories.find(cat => cat._id === categoryId);
        setSelectedCategory(categoryId);
        onCategoryChange(selectedCat);
    };

    if (loading) {
        return <div>Loading categories...</div>;
    }

    return (
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Select Category</InputLabel>
            <Select
                value={selectedCategory}
                onChange={handleChange}
                label="Select Category"
            >
                {categories.map((category) => (
                    <MenuItem key={category._id} value={category._id}>
                        {category.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default CategorySelector;
