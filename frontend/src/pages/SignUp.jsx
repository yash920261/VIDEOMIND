import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Antigravity from '../components/particles/Antigravity';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      await register(name.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Antigravity count={50} />
      
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-header">
          <p className="text-eyebrow">Join VideoMind</p>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Build your personal vector knowledge library</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                id="name"
                type="text"
                className="input"
                placeholder="Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                id="password"
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-smoke)' }} />
              <input
                id="confirmPassword"
                type="password"
                className="input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            style={{ width: '100%', marginTop: 'var(--spacing-12)', height: '48px' }}
          >
            {submitting ? (
              <span className="spinner spinner-sm" style={{ borderColor: 'var(--color-bone) transparent transparent transparent' }} />
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </motion.button>
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login" className="auth-footer-link">
            Sign In <ArrowRight size={12} style={{ display: 'inline', marginLeft: '2px' }} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
