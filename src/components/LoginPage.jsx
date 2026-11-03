import React, { useState } from 'react';
import {
  Eye, EyeOff, AlertCircle, Users, CheckCircle2
} from 'lucide-react';
import BrandLogo from './BrandLogo';

import { API_BASE } from '../config';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // view: 'login' | 'forgot' | 'reset-sent' | 'reset-error'
  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [switchingView, setSwitchingView] = useState(false);

  const triggerViewSwitch = (targetView) => {
    setSwitchingView(true);
    setTimeout(() => {
      setView(targetView);
      setError('');
      setSwitchingView(false);
    }, 400);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetEmail.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetErrorMsg('If you do not receive the password reset email, send a new request making sure you insert the correct email.');
        setSubmittedEmail(resetEmail.trim());
        setView('reset-error');
        return;
      }
      setSubmittedEmail(resetEmail.trim());
      setView('reset-sent');
    } catch {
      setError('Cannot connect to PICS server. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Login failed. Please check your credentials.');
        return;
      }
      if (rememberMe) {
        localStorage.setItem('epic_user', JSON.stringify(data));
        localStorage.setItem('remembered_email', email);
      } else {
        sessionStorage.setItem('epic_user', JSON.stringify(data));
        localStorage.removeItem('remembered_email');
      }
      if (onLogin) onLogin(data);
    } catch {
      setError('Cannot connect to PICS server. Make sure the API server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    height: '46px',
    padding: '0 1rem',
    borderRadius: '0.6rem',
    border: '1px solid #e2e8f0',
    fontSize: '0.875rem',
    outline: 'none',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box',
  };

  const focusInput = (e) => {
    e.target.style.borderColor = 'var(--brand-primary, #006EB3)';
    e.target.style.boxShadow = '0 0 0 3px rgba(0, 110, 179, 0.15)';
  };
  const blurInput = (e) => {
    e.target.style.borderColor = 'var(--border-primary, #e2e8f0)';
    e.target.style.boxShadow = 'none';
  };

  const btnGreen = {
    width: '100%', height: '48px', borderRadius: '0.75rem',
    background: 'var(--brand-primary, #006EB3)', color: 'var(--brand-button-text, #ffffff)', border: 'none',
    fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 110, 179, 0.25)',
    transition: 'background-color 0.2s ease, transform 0.15s ease',
  };

  const footer = (
    <footer style={{ marginTop: '3.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
      &copy; 2026 PICS. All rights reserved.
    </footer>
  );

  const renderView = () => {
    /* ── reset-sent: email sent successfully ── */
    if (view === 'reset-sent') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', letterSpacing: '-0.03em' }}>
              Reset Password
            </h1>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
              {submittedEmail}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              If you do not receive the password reset email, send a new request making sure you insert the correct email.
            </p>
          </div>
          <button
            style={btnGreen}
            onClick={() => triggerViewSwitch('login')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
          >
            Return to Login
          </button>
          {footer}
        </>
      );
    }

    /* ── reset-error: email not found / invalid ── */
    if (view === 'reset-error') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.5rem 0', letterSpacing: '-0.03em' }}>
              Reset Password
            </h1>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
              {submittedEmail}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              {resetErrorMsg || 'If you do not receive the password reset email, send a new request making sure you insert the correct email.'}
            </p>
          </div>
          <button
            style={btnGreen}
            onClick={() => triggerViewSwitch('login')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
          >
            Return to Login
          </button>
          {footer}
        </>
      );
    }

    /* ── forgot: reset form ── */
    if (view === 'forgot') {
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0', letterSpacing: '-0.03em' }}>
              Reset Password
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
              Don't worry! It happens. Please enter the email associated with your account.
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.825rem', fontWeight: 500, marginBottom: '1.5rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Registered Email</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(''); }}
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ ...btnGreen, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Remember Password?{' '}
              <a
                href="#login"
                onClick={(e) => { e.preventDefault(); triggerViewSwitch('login'); }}
                style={{ fontWeight: 700, color: 'var(--brand-primary, #006EB3)', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
              >
                Log In
              </a>
            </span>
          </div>
          {footer}
        </>
      );
    }

    /* ── login (default) ── */
    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0', letterSpacing: '-0.03em' }}>
            Login
          </h1>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.825rem', fontWeight: 500, marginBottom: '1.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Email</label>
            <input
              type="email"
              required
              placeholder="Enter email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                style={{ ...inputStyle, padding: '0 2.75rem 0 1rem' }}
                onFocus={focusInput}
                onBlur={blurInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{ position: 'absolute', right: '0.85rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="rememberMeCheck"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary, #006EB3)', cursor: 'pointer' }}
                />
                <label htmlFor="rememberMeCheck" style={{ fontSize: '0.825rem', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                  Remember me
                </label>
              </div>
              <a
                href="#forgot"
                onClick={(e) => { e.preventDefault(); triggerViewSwitch('forgot'); }}
                style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.target.style.color = 'var(--brand-primary, #006EB3)'; }}
                onMouseLeave={(e) => { e.target.style.color = '#475569'; }}
              >
                Forgot Password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...btnGreen, marginTop: '0.5rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {footer}
      </>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
      width: '100vw',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: '#ffffff',
      color: '#0f172a',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes epicSpinner { to { transform: rotate(360deg); } }
        @keyframes epicFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {switchingView && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid #f1f5f9', borderTopColor: 'var(--brand-primary, #006EB3)', animation: 'epicSpinner 0.8s linear infinite' }} />
        </div>
      )}

      {/* LEFT: Showcase Panel */}
      <div style={{
        order: 1,
        flex: '1 1 50%',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3rem 2.5rem',
        position: 'relative',
        borderRight: '1px solid #f1f5f9',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(0, 110, 179, 0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <BrandLogo variant="login" showSupportingText={true} />

        <div style={{ width: '100%', maxWidth: '460px', margin: '2rem 0', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', background: '#ffffff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px -15px rgba(15,23,42,0.08)', padding: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Dashboard</h4>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time recognition overview</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.75rem', borderRadius: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>RECOGNITION</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>99.4%</span>
                  <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#047857', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontWeight: 700 }}>+2.5%</span>
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', padding: '0.75rem', borderRadius: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>ATTENDANCE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>1,280</span>
                  <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontWeight: 700 }}>+15%</span>
                </div>
              </div>
            </div>
            <div style={{ background: '#fafafa', borderRadius: '0.75rem', padding: '0.85rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '65px', gap: '0.4rem' }}>
              {[40, 65, 45, 90, 75, 100, 60].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? 'var(--brand-primary, #006EB3)' : '#cbd5e1', borderRadius: '0.25rem' }} />
              ))}
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '-25px', right: '-15px', width: '210px', background: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.12)', padding: '1rem', zIndex: 2 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={14} color="var(--brand-primary, #006EB3)" /><span>Staff Templates</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>Engineering</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>Verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>Operations</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>Active</span>
              </div>
            </div>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center', maxWidth: '380px', lineHeight: '1.4' }}>
          AI-Powered Attendance &amp; Biometric Intelligence Platform
        </p>
      </div>

      {/* RIGHT: Form Panel */}
      <div style={{
        order: 2,
        flex: '1 1 50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        background: '#ffffff',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column' }}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}
