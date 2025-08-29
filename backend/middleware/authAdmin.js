const jwt = require("jsonwebtoken");

const authAdmin = (req, res, next) => {
  console.log('🔐 AuthAdmin middleware - checking authorization...');
  const token = req.headers.authorization?.split(" ")[1];
  console.log('🔐 AuthAdmin middleware - token present:', !!token);
  
  if (!token) {
    console.log('❌ AuthAdmin middleware - no token provided');
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    console.log('🔐 AuthAdmin middleware - token decoded:', { userId: decoded.userId, email: decoded.email, role: decoded.role });
    
    if (decoded.role !== "admin") {
      console.log('❌ AuthAdmin middleware - user is not admin, role:', decoded.role);
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    
    req.user = decoded;
    console.log('✅ AuthAdmin middleware - admin access granted');
    next();
  } catch (err) {
    console.log('❌ AuthAdmin middleware - token verification failed:', err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authAdmin;
