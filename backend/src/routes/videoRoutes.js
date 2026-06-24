const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const summaryController = require('../controllers/summaryController');
const notesController = require('../controllers/notesController');
const quizController = require('../controllers/quizController');

// Core Video Endpoints
router.post('/', videoController.addVideo);
router.get('/', videoController.getVideos);
router.get('/:id', videoController.getVideo);
router.delete('/:id', videoController.deleteVideo);

// AI Generated Content Endpoints
router.get('/:id/summary', summaryController.getSummary);
router.get('/:id/notes', notesController.getNotes);
router.get('/:id/quiz', quizController.getQuiz);

module.exports = router;
