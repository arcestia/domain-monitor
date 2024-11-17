const pool = require('../config/db');

const apiAuth = async (req, res, next) => {
    try {
        const apiToken = req.header('X-API-Token');
        
        if (!apiToken) {
            return res.status(401).json({ error: 'API token required' });
        }

        const [users] = await pool.execute(
            'SELECT id, api_calls_count, api_calls_limit, api_calls_reset_at FROM users WHERE api_token = ? AND is_active = true',
            [apiToken]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid API token' });
        }

        const user = users[0];

        // Reset API calls count if reset time has passed
        const now = new Date();
        if (user.api_calls_reset_at && now > new Date(user.api_calls_reset_at)) {
            await pool.execute(
                'UPDATE users SET api_calls_count = 0, api_calls_reset_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE id = ?',
                [user.id]
            );
            user.api_calls_count = 0;
        }

        // Check API call limits
        if (user.api_calls_count >= user.api_calls_limit) {
            return res.status(429).json({ error: 'API call limit exceeded' });
        }

        // Increment API calls count
        await pool.execute(
            'UPDATE users SET api_calls_count = api_calls_count + 1 WHERE id = ?',
            [user.id]
        );

        req.user = { id: user.id };
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = apiAuth;
