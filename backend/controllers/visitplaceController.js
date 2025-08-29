const VisitPlace = require('../models/VisitPlace');
const fs = require('fs');

const addVisitPlace = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description || !req.file) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newPlace = new VisitPlace({
      name,
      description,
      image: req.file.path,
    });

    const savedPlace = await newPlace.save();
    res.status(201).json(savedPlace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getVisitPlaces = async (req, res) => {
  try {
    const places = await VisitPlace.find().sort({ createdAt: -1 });
    res.json(places);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Visit Place
const updateVisitPlace = async (req, res) => {
    try {
      const { name, description } = req.body;
      const place = await VisitPlace.findById(req.params.id);
  
      if (!place) {
        return res.status(404).json({ message: 'Visit place not found' });
      }
  
      // Update fields
      place.name = name || place.name;
      place.description = description || place.description;
  
      // If a new image is uploaded, delete old one and replace it
      if (req.file) {
        if (place.image && fs.existsSync(place.image)) {
          fs.unlink(place.image, (err) => {
            if (err) console.error('Failed to delete old image:', err);
          });
        }
        place.image = req.file.path;
      }
  
      const updatedPlace = await place.save();
      res.json(updatedPlace);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  // Delete Visit Place
  const deleteVisitPlace = async (req, res) => {
    try {
      const place = await VisitPlace.findByIdAndDelete(req.params.id);
  
      if (!place) {
        return res.status(404).json({ message: 'Visit place not found' });
      }
  
      if (place.image && fs.existsSync(place.image)) {
        fs.unlink(place.image, (err) => {
          if (err) console.error('Failed to delete image:', err);
        });
      }
  
      res.json({ message: 'Visit place deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  module.exports = {
    addVisitPlace,
    getVisitPlaces,
    updateVisitPlace,
    deleteVisitPlace
  };
  
