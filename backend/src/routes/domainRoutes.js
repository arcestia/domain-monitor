const express = require('express');
const router = express.Router();
const creditCheck = require('../middleware/creditCheck');
const { 
    getAllDomains,
    addDomain,
    removeDomain,
    checkDomain
} = require('../controllers/domainController');

// Get all domains for the authenticated user
router.get('/', getAllDomains);

// Add a new domain (requires credits)
router.post('/', creditCheck, addDomain);

// Remove a domain
router.delete('/:id', removeDomain);

// Manual domain check (requires credits)
router.post('/:id/check', creditCheck, checkDomain);

module.exports = router;
