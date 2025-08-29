// Helper function to construct proper image URL
const constructImageUrl = (item) => {
  // Try different image sources in order of preference
  let imagePath = null;
  
  if (item.productId?.images && item.productId.images.length > 0) {
    imagePath = item.productId.images[0];
  } else if (item.productId?.image) {
    imagePath = item.productId.image;
  } else if (item.image) {
    imagePath = item.image;
  }
  
  if (!imagePath) return null;
  
  // Ensure the path starts with uploads/ if it's not already a full URL
  if (!imagePath.startsWith('http') && !imagePath.startsWith('uploads/')) {
    imagePath = `uploads/${imagePath}`;
  }
  
  return imagePath;
};
