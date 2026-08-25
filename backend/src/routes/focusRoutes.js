const express = require('express');
const router = express.Router();
const focusController = require('../controllers/focusController');

router.post('/calculate', focusController.calculateFocusScore);

module.exports = router;
