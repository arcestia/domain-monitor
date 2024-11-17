const express = require('express');
const router = express.Router();
const { register, login, changePassword, generateApiToken } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.post('/change-password', authenticateToken, changePassword);
router.post('/generate-token', authenticateToken, generateApiToken);

module.exports = router;
