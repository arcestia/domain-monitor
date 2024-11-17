const pool = require('../config/db');

const adminAuth = async (req, res, next) => {
    try {
        const [users] = await pool.execute(
            'SELECT role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = adminAuth;
