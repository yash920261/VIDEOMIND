const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const videoRoutes = require('./videoRoutes');
const chatRoutes = require('./chatRoutes');
const authMiddleware = require('../middleware/authMiddleware');

router.use('/auth', authRoutes);
router.use('/videos', authMiddleware, videoRoutes);
router.use('/chat', authMiddleware, chatRoutes);

module.exports = router;

