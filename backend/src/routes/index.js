const express = require('express');
const router = express.Router();

const videoRoutes = require('./videoRoutes');
const chatRoutes = require('./chatRoutes');

router.use('/videos', videoRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
