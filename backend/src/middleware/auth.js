const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database with all necessary fields
        const [users] = await pool.execute(
            `SELECT 
                id, 
                username, 
                email,
                role,
                credits,
                api_calls_limit,
                api_calls_count,
                api_token,
                is_active
            FROM users 
            WHERE id = ? AND is_active = true`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Attach full user object to request
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    authenticateToken
};
