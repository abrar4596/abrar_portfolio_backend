const express = require('express');
const router = express.Router();
const { createLead } = require('../controllers/leadController');

// Map POST /api/leads to the createLead controller
router.post('/', createLead);

module.exports = router;
