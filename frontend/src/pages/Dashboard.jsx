import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Video, Trash2, Clock, CheckCircle2,
  AlertCircle, Loader2, X, Zap
} from 'lucide-react';
import { videoAPI } from '../services/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', className: 'badge-amber' },
  processing: { icon: Loader2, label: 'Processing', className: 'badge-plum' },
  completed: { icon: CheckCircle2, label: 'Ready', className: 'badge-success' },
  failed: { icon: AlertCircle, label: 'Failed', className: 'badge-error' },
};

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchVideos();
    // Auto-open modal if URL param exists
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(urlParam);
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchVideos = async () => {
    try {
      const data = await videoAPI.getVideos();
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const data = await videoAPI.addVideo(url.trim());
      setVideos(prev => [data.video, ...prev]);
      setUrl('');
      setShowModal(false);
      // Navigate to the chat page for the new video
      if (data.video?._id) {
        navigate(`/video/${data.video._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to add video');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await videoAPI.deleteVideo(id);
      setVideos(prev => prev.filter(v => v._id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const filteredVideos = videos.filter(v =>
    v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.channel?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-48)' }}>
      {/* Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className="text-heading">Your Videos</h1>
          <p className="text-body-sm" style={{ color: 'var(--color-smoke)', marginTop: '4px' }}>
            {videos.length} video{videos.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <motion.div
          style={{ display: 'flex', gap: 'var(--spacing-12)', alignItems: 'center' }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="dashboard-search input-wrapper">
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
            <input
              className="input"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>
          <motion.button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Plus size={16} />
            Add Video
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Video Grid */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner spinner-lg" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <motion.div
          className="empty-state"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="empty-state-icon"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Video size={32} />
          </motion.div>
          <h2 className="empty-state-title">
            {searchQuery ? 'No videos found' : 'No videos yet'}
          </h2>
          <p className="empty-state-text">
            {searchQuery
              ? 'Try a different search term'
              : 'Add your first YouTube video to get started with AI-powered analysis'}
          </p>
          {!searchQuery && (
            <motion.button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Plus size={16} />
              Add Your First Video
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="dashboard-grid"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {filteredVideos.map((video, idx) => {
            const status = statusConfig[video.transcriptStatus] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={video._id}
                className="video-card"
                variants={fadeInUp}
                custom={idx}
                onClick={() => video.transcriptStatus === 'completed' && navigate(`/video/${video._id}`)}
                whileHover={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  backgroundColor: '#161616',
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="video-card-thumbnail">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                      <Video size={40} color="var(--color-smoke)" />
                    </div>
                  )}
                  {video.duration && (
                    <span className="video-card-duration">{video.duration}</span>
                  )}
                </div>
                <div className="video-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 className="video-card-title">{video.title || 'Untitled Video'}</h3>
                      <p className="video-card-channel">{video.channel || 'Unknown Channel'}</p>
                    </div>
                    <motion.button
                      className="btn-icon"
                      onClick={(e) => handleDelete(video._id, e)}
                      style={{ color: 'var(--color-smoke)', flexShrink: 0 }}
                      aria-label="Delete video"
                      whileHover={{ color: '#ff4d6a' }}
                      transition={{ duration: 0.2 }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <span className={`badge ${status.className}`}>
                      <StatusIcon size={12} className={video.transcriptStatus === 'processing' ? 'spin-animation' : ''} />
                      {status.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add Video Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="text-heading-sm">Add Video</h2>
                <motion.button
                  className="btn-icon"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <form onSubmit={handleAddVideo}>
                <p className="text-body-sm" style={{ color: 'var(--color-smoke)', marginBottom: 'var(--spacing-24)' }}>
                  Paste a YouTube video URL to extract its transcript and build an AI knowledge base.
                </p>

                <input
                  className="input input-lg"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(''); }}
                  autoFocus
                  required
                />

                {error && (
                  <p style={{ color: 'var(--color-error)', fontSize: '13px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> {error}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-12)', marginTop: 'var(--spacing-24)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !url.trim()}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ width: '14px', height: '14px' }} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Analyze Video
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
