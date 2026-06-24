const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.askQuestion);
router.get('/:videoId', chatController.getChatHistory);

module.exports = router;
