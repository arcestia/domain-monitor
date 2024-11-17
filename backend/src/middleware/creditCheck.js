const pool = require('../config/db');

const creditCheck = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // Get user's current credits
        const [users] = await pool.execute(
            'SELECT credits FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        
        // Check if user has enough credits (minimum 1)
        if (user.credits < 1) {
            return res.status(403).json({ error: 'Insufficient credits' });
        }

        next();
    } catch (error) {
        console.error('Credit check error:', error);
        res.status(500).json({ error: 'Failed to check credits' });
    }
};

module.exports = creditCheck;
