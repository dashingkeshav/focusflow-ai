const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/start', authMiddleware, sessionController.startSession);
router.post('/end', authMiddleware, sessionController.endSession);
router.get('/history', authMiddleware, sessionController.getSessionHistory);

module.exports = router;
