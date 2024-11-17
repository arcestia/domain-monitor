const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const [existingUsers] = await pool.execute(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user with default credits and role
        const [result] = await pool.execute(
            `INSERT INTO users (
                username, 
                email, 
                password, 
                role,
                credits,
                api_calls_limit,
                api_calls_count,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, 'user', 100, 1000, 0, true]
        );
        
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.login = async (req, res) => {
    try {
        console.log('Login attempt:', req.body);
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await pool.execute(
            `SELECT 
                id,
                username,
                email,
                password,
                role,
                credits,
                api_calls_limit,
                api_calls_count,
                api_token,
                is_active
            FROM users 
            WHERE email = ?`,
            [email]
        );
        
        console.log('Found users:', users.length);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', isValid);
        console.log('Stored hash:', user.password);
        console.log('Provided password:', password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is inactive' });
        }
        
        // Generate token
        const token = jwt.sign(
            { 
                id: user.id,
                role: user.role
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        // Return user info without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            token,
            ...userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        // Get user
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

exports.generateApiToken = async (req, res) => {
    try {
        const userId = req.user.id;

        // Generate a random token
        const apiToken = crypto.randomBytes(32).toString('hex');

        // Update user's API token
        await pool.execute(
            'UPDATE users SET api_token = ? WHERE id = ?',
            [apiToken, userId]
        );

        // Get updated user info
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
            WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            message: 'API token generated successfully',
            user_info: user
        });
    } catch (error) {
        console.error('Generate API token error:', error);
        res.status(500).json({ error: 'Failed to generate API token' });
    }
};
