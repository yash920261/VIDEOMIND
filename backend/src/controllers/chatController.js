const Chat = require('../models/Chat');
const Video = require('../models/Video');
const { answerQuestion } = require('../services/aiService');

/**
 * POST /api/chat — Ask a question about a video (RAG Q&A)
 */
exports.askQuestion = async (req, res, next) => {
  try {
    const { videoId, question } = req.body;

    if (!videoId || !question) {
      return res.status(400).json({ message: 'videoId and question are required' });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.transcriptStatus === 'failed') {
      return res.status(400).json({ message: 'Video processing failed. Please delete and try again.' });
    }
    if (video.transcriptStatus !== 'completed') {
      return res.status(400).json({ message: 'Video is still being processed' });
    }

    // Perform RAG Q&A
    const { answer, sources } = await answerQuestion(question, video._id);

    // Save to chat history
    const chat = await Chat.create({
      videoId: video._id,
      question,
      answer,
      sources,
    });

    res.json({
      answer,
      sources,
      chatId: chat._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/:videoId — Get chat history for a video
 */
exports.getChatHistory = async (req, res, next) => {
  try {
    const chats = await Chat.find({ videoId: req.params.videoId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ chats });
  } catch (error) {
    next(error);
  }
};
