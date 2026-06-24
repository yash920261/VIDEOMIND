const Video = require('../models/Video');
const Chunk = require('../models/Chunk');
const { generateQuiz } = require('../services/aiService');

/**
 * GET /api/videos/:id/quiz — Generate or return cached quiz
 */
exports.getQuiz = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.transcriptStatus === 'failed') {
      return res.status(400).json({ message: 'Video processing failed. Please delete and try again.' });
    }
    if (video.transcriptStatus !== 'completed') {
      return res.status(400).json({ message: 'Video is still being processed' });
    }

    // Return cached quiz if available
    if (video.quiz && video.quiz.length > 0) {
      return res.json({ quiz: video.quiz });
    }

    // Generate new quiz
    const chunks = await Chunk.find({ videoId: video._id })
      .sort({ chunkIndex: 1 })
      .select('text')
      .lean();

    const fullTranscript = chunks.map(c => c.text).join(' ');
    const quiz = await generateQuiz(fullTranscript, video.title);

    // Cache the quiz
    video.quiz = quiz;
    await video.save();

    res.json({ quiz });
  } catch (error) {
    next(error);
  }
};
