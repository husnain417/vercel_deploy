const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid authentication token'
        });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

function authenticateResetToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) {
      return res.status(401).json({ message: 'No token provided' });
    }
  
    jwt.verify(token, process.env.RESET_TOKEN_SECRET, async (err, user) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ message: 'Invalid token' });
      }
  
      req.user = user; 
      next();
    });
  };
  

// const isVerifiedStudent = async (req, res, next) => {
//     try {
//         if (!req.user.studentVerification.isVerified) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Access denied. Student verification required.'
//             });
//         }
//         next();
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Server error'
//         });
//     }
// };

module.exports = {
    auth,
    isAdmin,
    authenticateResetToken,
    // isVerifiedStudent
}; 