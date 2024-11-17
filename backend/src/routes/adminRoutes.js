const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Admin route protection middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Apply auth middleware and admin check to all routes
router.use(auth.authenticateToken, requireAdmin);

// Admin's own domain management
router.get('/domains', adminController.getAdminDomains);
router.post('/domains', adminController.addAdminDomain);
router.post('/domains/:domainId/check', adminController.checkAdminDomain);
router.delete('/domains/:domainId', adminController.removeAdminDomain);

// User management routes
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);

// API token management
router.post('/users/:id/api-token', adminController.generateApiToken);
router.delete('/users/:id/api-token', adminController.revokeApiToken);

// User statistics
router.get('/users/:id/stats', adminController.getUserStats);

module.exports = router;
