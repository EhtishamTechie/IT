const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth middleware - Authorization header:', authHeader ? 'present' : 'missing');
    console.log('🔐 Auth middleware - Token extracted:', token ? 'yes' : 'no');

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
      if (err) {
        console.log('❌ Auth middleware - Token verification failed:', err.message);
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      
      console.log('✅ Auth middleware - Token verified successfully');
      console.log('👤 Auth middleware - Decoded user:', { 
        id: user.userId || user.id, 
        email: user.email, 
        role: user.role 
      });
      
      // Normalize user object structure for compatibility
      req.user = {
        userId: user.userId || user.id,
        id: user.userId || user.id,  // For backward compatibility
        email: user.email,
        role: user.role,
        name: user.name  // May be undefined, that's okay
      };
      
      next();
    });
  } catch (error) {
    console.log('💥 Auth middleware - Exception:', error.message);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Optional authentication - sets user if token exists, but doesn't require it
const optionalAuthentication = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      // No token provided - continue as guest user
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
      if (err) {
        // Invalid token - continue as guest user
        req.user = null;
      } else {
        // Valid token - set user
        req.user = user;
      }
      next();
    });
  } catch (error) {
    // Error in authentication - continue as guest user
    req.user = null;
    next();
  }
};

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ message: 'Admin access required' });
    }
  });
};

module.exports = {
  authenticateToken,
  optionalAuthentication,
  authenticateAdmin
};
