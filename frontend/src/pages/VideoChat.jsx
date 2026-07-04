import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send, MessageSquare, FileText, BookOpen, BrainCircuit,
  Clock, ExternalLink, Download, Loader2, RefreshCw, Copy, Check
} from 'lucide-react';
import { videoAPI, chatAPI } from '../services/api';

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TimestampLink({ startTime, endTime, videoId }) {
  const timeStr = endTime
    ? `${formatTimestamp(startTime)} — ${formatTimestamp(endTime)}`
    : formatTimestamp(startTime);

  const ytUrl = `https://youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}`;

  return (
    <motion.a
      href={ytUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="timestamp-link"
      whileHover={{ backgroundColor: 'rgba(128, 82, 255, 0.2)' }}
      transition={{ duration: 0.2 }}
    >
      <Clock size={11} />
      {timeStr}
      <ExternalLink size={10} />
    </motion.a>
  );
}

function ChatMessage({ message, videoYtId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.answer || message.question);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.type === 'user') {
    return (
      <motion.div
        className="chat-message chat-message-user"
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="chat-message-avatar">Y</div>
        <div className="chat-message-content">{message.question}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="chat-message chat-message-ai"
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.05 }}
    >
      <div className="chat-message-avatar">AI</div>
      <div className="chat-message-content">
        <div className="notes-content" style={{ padding: 0 }}>
          <ReactMarkdown>{message.answer}</ReactMarkdown>
        </div>

        {message.sources?.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {message.sources.map((src, i) => (
              <TimestampLink
                key={i}
                startTime={src.startTime}
                endTime={src.endTime}
                videoId={videoYtId}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button
            className="btn btn-ghost btn-sm"
            onClick={handleCopy}
            style={{ fontSize: '11px', padding: '4px 8px' }}
            whileHover={{ color: '#ffffff' }}
            transition={{ duration: 0.2 }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function VideoChat() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [notes, setNotes] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchVideo();
    fetchChatHistory();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchVideo = async () => {
    try {
      const data = await videoAPI.getVideo(id);
      setVideo(data.video);
    } catch (err) {
      console.error('Failed to fetch video:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const data = await chatAPI.getChatHistory(id);
      const formatted = (data.chats || []).flatMap(c => [
        { type: 'user', question: c.question },
        { type: 'ai', answer: c.answer, sources: c.sources },
      ]);
      setMessages(formatted);
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || asking) return;

    const q = question.trim();
    setQuestion('');
    setMessages(prev => [...prev, { type: 'user', question: q }]);
    setAsking(true);

    try {
      const data = await chatAPI.askQuestion(id, q);
      setMessages(prev => [...prev, {
        type: 'ai',
        answer: data.answer,
        sources: data.sources || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        type: 'ai',
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
        sources: [],
      }]);
    } finally {
      setAsking(false);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    if (tab === 'summary' && !summary) {
      setTabLoading(true);
      try {
        const data = await videoAPI.getSummary(id);
        setSummary(data.summary);
      } catch (err) {
        setSummary({ error: 'Failed to generate summary' });
      } finally {
        setTabLoading(false);
      }
    } else if (tab === 'notes' && !notes) {
      setTabLoading(true);
      try {
        const data = await videoAPI.getNotes(id);
        setNotes(data.notes);
      } catch (err) {
        setNotes('Failed to generate notes');
      } finally {
        setTabLoading(false);
      }
    } else if (tab === 'quiz' && !quiz) {
      setTabLoading(true);
      try {
        const data = await videoAPI.getQuiz(id);
        setQuiz(data.quiz);
      } catch (err) {
        setQuiz([]);
      } finally {
        setTabLoading(false);
      }
    }
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="empty-state">
        <h2 className="empty-state-title">Video not found</h2>
        <p className="empty-state-text">This video may have been deleted or doesn't exist.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'notes', label: 'Notes', icon: BookOpen },
    { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
  ];

  const tabContentVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  };

  return (
    <div className="split-pane">
      {/* Left: Video Player */}
      <div className="split-pane-left">
        <div className="video-player-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="video-meta">
          <h2 className="video-meta-title">{video.title}</h2>
          <p className="video-meta-channel">{video.channel} • {video.duration}</p>
          <div className="video-meta-actions">
            <motion.button
              className="btn btn-secondary btn-sm"
              onClick={() => handleTabChange('summary')}
              whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
              transition={{ duration: 0.2 }}
            >
              <FileText size={14} /> Summary
            </motion.button>
            <motion.button
              className="btn btn-secondary btn-sm"
              onClick={() => handleTabChange('notes')}
              whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
              transition={{ duration: 0.2 }}
            >
              <BookOpen size={14} /> Notes
            </motion.button>
            <motion.button
              className="btn btn-secondary btn-sm"
              onClick={() => handleTabChange('quiz')}
              whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
              transition={{ duration: 0.2 }}
            >
              <BrainCircuit size={14} /> Quiz
            </motion.button>
          </div>
        </div>
      </div>

      {/* Right: Chat / Tabs */}
      <div className="split-pane-right">
        {/* Tab Bar */}
        <div className="chat-tabs">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              className={`chat-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              whileHover={{ color: '#ffffff' }}
              transition={{ duration: 0.15 }}
            >
              <tab.icon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              className="chat-window"
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <div className="chat-messages">
                {messages.length === 0 && (
                  <motion.div
                    className="empty-state"
                    style={{ padding: 'var(--spacing-48)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <motion.div
                      className="empty-state-icon"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <MessageSquare size={28} />
                    </motion.div>
                    <h3 className="empty-state-title">Ask anything about this video</h3>
                    <p className="empty-state-text">
                      I've analyzed the transcript and can answer questions with timestamp references.
                    </p>
                  </motion.div>
                )}
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} videoYtId={video.videoId} />
                ))}
                {asking && (
                  <motion.div
                    className="chat-message chat-message-ai"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <div className="chat-message-avatar">AI</div>
                    <div className="chat-message-content">
                      <div className="pulse-loader">
                        <span /><span /><span />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleAsk}>
                <div className="chat-input-wrapper">
                  <input
                    className="chat-input"
                    placeholder="Ask a question about this video..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={asking}
                  />
                  <motion.button
                    type="submit"
                    className="chat-send-btn"
                    disabled={asking || !question.trim()}
                    aria-label="Send question"
                    whileHover={!asking && question.trim() ? { backgroundColor: '#6b3de6' } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    {asking ? <Loader2 size={18} className="spin-animation" /> : <Send size={18} />}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-24)' }}
            >
              {tabLoading ? (
                <div className="empty-state"><div className="spinner spinner-lg" /></div>
              ) : summary?.error ? (
                <div className="empty-state">
                  <p className="text-body" style={{ color: 'var(--color-error)' }}>{summary.error}</p>
                </div>
              ) : summary ? (
                <div className="notes-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-24)' }}>
                    <h2 className="text-heading-sm">Video Summary</h2>
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(
                        `# Summary: ${video.title}\n\n## Short\n${summary.short}\n\n## Detailed\n${summary.detailed}\n\n## Key Points\n${summary.bullets?.map(b => `- ${b}`).join('\n')}`,
                        `${video.title}-summary.md`
                      )}
                      whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Download size={14} /> Download
                    </motion.button>
                  </div>

                  <h3>Short Summary</h3>
                  <p>{summary.short}</p>

                  <h3>Detailed Summary</h3>
                  <p>{summary.detailed}</p>

                  {summary.bullets?.length > 0 && (
                    <>
                      <h3>Key Points</h3>
                      <ul>
                        {summary.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <motion.button
                    className="btn btn-primary"
                    onClick={() => handleTabChange('summary')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <FileText size={14} /> Generate Summary
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div
              key="notes"
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-24)' }}
            >
              {tabLoading ? (
                <div className="empty-state"><div className="spinner spinner-lg" /></div>
              ) : notes ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-24)' }}>
                    <h2 className="text-heading-sm">Study Notes</h2>
                    <motion.button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownload(notes, `${video.title}-notes.md`)}
                      whileHover={{ borderColor: 'rgba(255,255,255,0.2)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Download size={14} /> Download
                    </motion.button>
                  </div>
                  <div className="notes-content" style={{ padding: 0 }}>
                    <ReactMarkdown>{notes}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <motion.button
                    className="btn btn-primary"
                    onClick={() => handleTabChange('notes')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <BookOpen size={14} /> Generate Notes
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-24)' }}
            >
              {tabLoading ? (
                <div className="empty-state"><div className="spinner spinner-lg" /></div>
              ) : quiz?.length > 0 ? (
                <QuizView quiz={quiz} videoTitle={video.title} />
              ) : (
                <div className="empty-state">
                  <motion.button
                    className="btn btn-primary"
                    onClick={() => handleTabChange('quiz')}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <BrainCircuit size={14} /> Generate Quiz
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function QuizView({ quiz, videoTitle }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const q = quiz[currentQ];
  const progress = ((currentQ + 1) / quiz.length) * 100;

  const handleSelect = (optionIdx) => {
    if (showResults) return;
    setAnswers(prev => ({ ...prev, [currentQ]: optionIdx }));
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const score = Object.entries(answers).reduce((acc, [qIdx, aIdx]) => {
    return acc + (quiz[qIdx]?.correctAnswer === aIdx ? 1 : 0);
  }, 0);

  if (showResults) {
    return (
      <div className="quiz-container" style={{ padding: 0 }}>
        <motion.div
          className="score-display"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="score-circle" style={{
            borderColor: score / quiz.length >= 0.7 ? 'var(--color-success)' : score / quiz.length >= 0.4 ? 'var(--color-amber-spark)' : 'var(--color-error)'
          }}>
            <span className="score-value">{score}/{quiz.length}</span>
            <span className="score-label">Score</span>
          </div>
          <h3 className="text-heading-sm" style={{ marginBottom: '8px' }}>
            {score / quiz.length >= 0.7 ? 'Great job!' : score / quiz.length >= 0.4 ? 'Good effort!' : 'Keep learning!'}
          </h3>
          <p className="text-body-sm" style={{ color: 'var(--color-smoke)' }}>
            You got {score} out of {quiz.length} questions correct
          </p>
          <motion.button
            className="btn btn-primary"
            style={{ marginTop: 'var(--spacing-24)' }}
            onClick={() => { setCurrentQ(0); setAnswers({}); setShowResults(false); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <RefreshCw size={14} /> Try Again
          </motion.button>
        </motion.div>

        {/* Show all questions with correct answers */}
        <div style={{ marginTop: 'var(--spacing-36)' }}>
          {quiz.map((question, qIdx) => (
            <motion.div
              key={qIdx}
              className="quiz-card"
              style={{ marginBottom: 'var(--spacing-18)' }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIdx * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="quiz-question">
                <span className="quiz-question-number">Q{qIdx + 1}. </span>
                {question.question}
              </p>
              <div className="quiz-options">
                {question.options.map((opt, oIdx) => (
                  <div
                    key={oIdx}
                    className={`quiz-option ${
                      oIdx === question.correctAnswer ? 'correct' :
                      oIdx === answers[qIdx] && oIdx !== question.correctAnswer ? 'incorrect' : ''
                    }`}
                  >
                    <span className="quiz-option-letter">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container" style={{ padding: 0 }}>
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <motion.div
            className="quiz-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <span className="quiz-progress-text">{currentQ + 1} / {quiz.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          className="quiz-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="quiz-question">
            <span className="quiz-question-number">Q{currentQ + 1}. </span>
            {q.question}
          </p>
          <div className="quiz-options">
            {q.options.map((opt, idx) => (
              <motion.button
                key={idx}
                className={`quiz-option ${answers[currentQ] === idx ? 'selected' : ''}`}
                onClick={() => handleSelect(idx)}
                whileHover={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}
                transition={{ duration: 0.2 }}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="quiz-actions">
        <button
          className="btn btn-secondary"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ(prev => prev - 1)}
        >
          Previous
        </button>
        {currentQ < quiz.length - 1 ? (
          <motion.button
            className="btn btn-primary"
            disabled={answers[currentQ] === undefined}
            onClick={() => setCurrentQ(prev => prev + 1)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            Next
          </motion.button>
        ) : (
          <motion.button
            className="btn btn-primary"
            disabled={Object.keys(answers).length < quiz.length}
            onClick={handleSubmit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            Submit Quiz
          </motion.button>
        )}
      </div>
    </div>
  );
}
