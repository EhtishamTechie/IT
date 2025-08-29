// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const { addVisitPlace, getVisitPlaces } = require('../controllers/visitplaceController');

// const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, './uploads/'),
//   filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
// });

// const upload = multer({ storage });

// router.post('/add', upload.single('image'), addVisitPlace);
// router.get('/all', getVisitPlaces);

// module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  addVisitPlace,
  getVisitPlaces,
  updateVisitPlace,
  deleteVisitPlace
} = require('../controllers/visitplaceController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use temp directory in production (Vercel), upload directory in development
    const destPath = process.env.NODE_ENV === 'production' ? '/tmp' : './uploads/';
    cb(null, destPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Routes
router.post('/add', upload.single('image'), addVisitPlace);
router.get('/all', getVisitPlaces);
router.put('/:id', upload.single('image'), updateVisitPlace);  // ✅ update
router.delete('/:id', deleteVisitPlace);                        // ✅ delete

module.exports = router;
