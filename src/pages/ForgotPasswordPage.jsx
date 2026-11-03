import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound, ArrowLeft, Users } from 'lucide-react';
import { API_BASE } from '../config';
import PageHeader from '../components/PageHeader';
import BrandLogo from '../components/BrandLogo';

const CRITERIA = [
  { key: 'length',  label: 'Password must be between 8 and 20 characters in length.',                          test: (p)    => p.length >= 8 && p.length <= 20 },
  { key: 'upper',   label: 'Each password must include at least one uppercase letter (A-Z).',                  test: (p)    => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Password must include at least one lowercase letter (a-z).',                       test: (p)    => /[a-z]/.test(p) },
  { key: 'digit',   label: 'At least one numeric digit (0-9) is required.',                                    test: (p)    => /[0-9]/.test(p) },
  { key: 'special', label: 'Password must include at least one special character (e.g., @, #, $, %, ^, &, *, !).', test: (p) => /[^A-Za-z0-9]/.test(p) },
  { key: 'match',   label: 'New password and confirm password must match.',                                    test: (p, c) => p.length > 0 && p === c },
];

function PasswordField({ placeholder, field, form, show, onChangeField, onToggleShow, inputBase, onFocus, onBlur }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type={show[field] ? 'text' : 'password'}
        placeholder={placeholder}
        value={form[field]}
        onChange={onChangeField(field)}
        style={inputBase}
        onFocus={onFocus}
        onBlur={onBlur}
        required
      />
      <button type="button" onClick={onToggleShow(field)} tabIndex={-1}
        style={{ position: 'absolute', right: '0.85rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
        {show[field] ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function ForgotPasswordPage({ 
  user, 
  onLogout, 
  onToggleSidebar, 
  onBack, 
  onNavigate, 
  isFirstLogin, 
  onPasswordUpdated,
  isResetMode = false,
  resetToken = ''
}) {
  const [form, setForm]     = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow]     = useState({ current: false, newPass: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);
  
  // resetView: 'profile' (dashboard) | 'loading' | 'form' | 'expired' | 'success'
  const [resetView, setResetView] = useState(isResetMode ? 'loading' : 'profile');

  const setField = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setError(''); };
  const toggleShow = (field) => () => setShow((s) => ({ ...s, [field]: !s[field] }));

  const allPassed = CRITERIA.every((c) => c.test(form.newPass, form.confirm));

  React.useEffect(() => {
    if (!isResetMode) return;
    if (!resetToken) {
      setResetView('expired');
      return;
    }
    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${resetToken}`);
        if (res.ok) {
          setResetView('form');
        } else {
          setResetView('expired');
        }
      } catch (err) {
        setResetView('expired');
      }
    };
    verifyToken();
  }, [isResetMode, resetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allPassed) { setError('Please meet all password criteria before submitting.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isResetMode) {
        const res = await fetch(`${API_BASE}/auth/reset-password-with-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: resetToken,
            new_password: form.newPass
          })
        });
        const data = await res.json();
        if (!res.ok) { setError(data.detail || 'Failed to reset password.'); return; }
        setResetView('success');
      } else {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            current_password: isFirstLogin ? undefined : form.current,
            new_password: form.newPass,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.detail || 'Failed to update password.'); return; }
        
        if (isFirstLogin && onPasswordUpdated) {
          const updatedUser = { ...user, is_first_login: false };
          onPasswordUpdated(updatedUser);
        } else {
          setSuccess(true);
          setTimeout(() => {
            if (onBack) onBack();
            else if (onNavigate) onNavigate('reports');
          }, 1500);
        }
      }
    } catch {
      setError('Cannot connect to PICS server. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Base input styles
  const inputBase = {
    width: '100%',
    height: '46px',
    padding: '0 2.75rem 0 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    outline: 'none',
    color: '#0f172a',
    background: '#f8fafc',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const onFocus = (e) => { 
    e.target.style.borderColor = 'var(--brand-primary, #006EB3)'; 
    e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12)'; 
  };
  const onBlur  = (e) => { 
    e.target.style.borderColor = '#cbd5e1'; 
    e.target.style.boxShadow = 'none'; 
  };

  // ── 1. LOADING STATE FOR TOKEN VALIDATION ──
  if (isResetMode && resetView === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid var(--brand-primary, #006EB3)', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite', marginBottom: '1.25rem' }} />
        <p style={{ fontSize: '0.925rem', color: '#475569', fontWeight: 500 }}>Validating reset token...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ── 2. LINK EXPIRED VIEW ──
  if (isResetMode && resetView === 'expired') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: "'Inter', sans-serif", padding: '2rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', maxWidth: '420px', width: '100%', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <AlertCircle size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Link Expired</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>Please generate a new password request anytime from the login screen.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{ width: '100%', height: '44px', borderRadius: '0.5rem', background: 'var(--brand-primary, #006EB3)', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.925rem', cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── 3. PASSWORD RESET SUCCESS VIEW ──
  if (isResetMode && resetView === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#f8fafc', fontFamily: "'Inter', sans-serif", padding: '2rem', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', maxWidth: '420px', width: '100%', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Password Reset</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>You can now login with your new password and continue using your account.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{ width: '100%', height: '44px', borderRadius: '0.5rem', background: 'var(--brand-primary, #006EB3)', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.925rem', cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // First Login or Reset Password Split Screen View
  if (isFirstLogin || (isResetMode && resetView === 'form')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100vw',
        background: '#ffffff',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden'
      }}>
        {/* LEFT PANEL: Password Form */}
        <div style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 6rem',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}>
          {/* Brand Logo: PICS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
            <BrandLogo variant="auth" showSupportingText={true} />
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {isResetMode ? "Set a new password" : "Update Password"}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 2.5rem 0', lineHeight: '1.5', maxWidth: '420px' }}>
            {isResetMode ? "to keep your account safe." : "You need to update your password because this is the first time you are signing in"}
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '420px' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <PasswordField placeholder="New Password" field="newPass" form={form} show={show} onChangeField={setField} onToggleShow={toggleShow} inputBase={inputBase} onFocus={onFocus} onBlur={onBlur} />
              <PasswordField placeholder="Confirm new password" field="confirm" form={form} show={show} onChangeField={setField} onToggleShow={toggleShow} inputBase={inputBase} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <button
              type="submit"
              disabled={loading || !allPassed}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '0.5rem',
                background: (loading || !allPassed) ? 'rgba(0, 110, 179, 0.40)' : 'var(--brand-primary, #006EB3)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.925rem',
                cursor: (loading || !allPassed) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                marginBottom: '2rem'
              }}
              onMouseEnter={(e) => { if (!loading && allPassed) e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
              onMouseLeave={(e) => { if (!loading && allPassed) e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>

            {/* Criteria Progress Bar / Pipe */}
            <div style={{ height: '3px', width: '100%', background: '#e2e8f0', borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(CRITERIA.filter(c => c.test(form.newPass, form.confirm)).length / CRITERIA.length) * 100}%`, background: '#10b981', transition: 'width 0.3s' }} />
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
              Password Criteria
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: isResetMode ? '1.5rem' : 0 }}>
              {CRITERIA.map((c) => {
                const active = form.newPass.length > 0 || (c.key === 'match' && form.confirm.length > 0);
                const passed = c.test(form.newPass, form.confirm);
                const textColor = active ? (passed ? '#10b981' : '#ef4444') : '#94a3b8';

                return (
                  <div key={c.key} style={{ fontSize: '0.78rem', color: textColor, transition: 'color 0.2s', lineHeight: '1.4' }}>
                    • {c.label}
                  </div>
                );
              })}
            </div>

            {isResetMode && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Remember Password?{' '}
                  <button
                    type="button"
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #006EB3)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', padding: 0, outline: 'none' }}
                  >
                    Log In
                  </button>
                </span>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT PANEL: Decorative Green Screen */}
        <div style={{
          flex: '1 1 50%',
          background: 'linear-gradient(135deg, #006EB3 0%, #005fa3 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          padding: '4rem',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* Simulated Interface Graphics */}
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3.5rem', opacity: 0.98 }}>
            
            {/* EPIC Dashboard Mockup Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
              color: '#0f172a'
            }}>
              {/* Header with dots */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>Dashboard</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Real-time recognition overview</div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                </div>
              </div>

              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>RECOGNITION</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>99.4%</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981' }}>+2.5%</span>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>ATTENDANCE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>1,280</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3b82f6' }}>+15%</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '40px', padding: '0 0.5rem' }}>
                {[30, 45, 35, 60, 50, 75, 90, 85].map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '8%',
                      height: `${val}%`,
                      background: idx === 6 ? 'var(--brand-primary, #006EB3)' : '#e2e8f0',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Staff Templates Card Overlay */}
            <div style={{
              background: '#ffffff',
              borderRadius: '1rem',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 15px 30px rgba(0,0,0,0.08)',
              color: '#0f172a',
              width: '80%',
              alignSelf: 'flex-end',
              marginRight: '-1.5rem',
              marginTop: '-0.75rem',
              zIndex: 2
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <Users size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>STAFF TEMPLATES</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    <span>Engineering</span>
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.7rem' }}>✓ Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em', maxWidth: '420px', lineHeight: '1.35' }}>
            AI-Powered Attendance & Biometric Intelligence
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: '380px', lineHeight: '1.6', margin: 0 }}>
            Integration of the complete flow of recognition and staff logs into a singular purpose-built platform
          </p>
        </div>
      </div>
    );
  }

  // Normal Password Reset Page inside Admin Dashboard
  return (
    <div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* ── Page Header ── */}
      <PageHeader title="Reset Password" icon={KeyRound} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} />

      {/* ── Body Container ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0px', display: 'flex', flexDirection: 'column' }}>

        {/* Outer White Card Container matching reference UI */}
        <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', width: '100%', boxSizing: 'border-box', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '2rem' }}>
            Update Password
          </div>

          <form onSubmit={handleSubmit}>
            {/* 2-column Layout for Inputs and Criteria */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>

              {/* ── LEFT: Form Inputs ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{error}</span>
                  </div>
                )}

                {success ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0', textAlign: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={28} color="#10b981" />
                    </div>
                    <div>
                      <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>Password Updated!</p>
                      <p style={{ fontSize: '0.825rem', color: '#64748b', margin: 0 }}>Your password has been changed successfully. Redirecting to reports...</p>
                    </div>
                    <button
                      type="button"
                      onClick={onBack}
                      style={{ marginTop: '0.5rem', padding: '0.6rem 1.75rem', borderRadius: '2rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Go to Reports
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }}>Current Password</label>
                      <PasswordField placeholder="Enter current password" field="current" form={form} show={show} onChangeField={setField} onToggleShow={toggleShow} inputBase={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }}>New Password</label>
                      <PasswordField placeholder="Enter new password" field="newPass" form={form} show={show} onChangeField={setField} onToggleShow={toggleShow} inputBase={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em' }}>Confirm Password</label>
                      <PasswordField placeholder="Confirm new password" field="confirm" form={form} show={show} onChangeField={setField} onToggleShow={toggleShow} inputBase={inputBase} onFocus={onFocus} onBlur={onBlur} />
                    </div>
                  </>
                )}
              </div>

              {/* ── RIGHT: Criteria Section with Progress Bar ── */}
              <div>
                {/* Horizontal Progress Bar / Pipe */}
                <div style={{ height: '3px', width: '100%', background: '#e2e8f0', borderRadius: '2px', marginBottom: '1.25rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(CRITERIA.filter(c => c.test(form.newPass, form.confirm)).length / CRITERIA.length) * 100}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
                </div>

                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                  Password Criteria
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {CRITERIA.map((c) => {
                    const active = form.newPass.length > 0 || (c.key === 'match' && form.confirm.length > 0);
                    const passed = c.test(form.newPass, form.confirm);
                    const textColor = active ? (passed ? '#10b981' : '#ef4444') : '#94a3b8';

                    return (
                      <div key={c.key} style={{ fontSize: '0.8rem', color: textColor, lineHeight: '1.4', transition: 'color 0.2s' }}>
                        • {c.label}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Button Container */}
            {!success && (
              <div style={{ marginTop: '2.5rem' }}>
                <button
                  type="submit"
                  disabled={loading || !allPassed}
                  style={{
                    height: '42px',
                    padding: '0 2.25rem',
                    borderRadius: '2rem',
                    background: (loading || !allPassed) ? 'rgba(0, 110, 179, 0.4)' : 'var(--brand-primary, #006EB3)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: (loading || !allPassed) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !allPassed) ? 0.75 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!loading && allPassed) e.currentTarget.style.background = 'var(--brand-primary-hover, #0084D6)'; }}
                  onMouseLeave={(e) => { if (!loading && allPassed) e.currentTarget.style.background = 'var(--brand-primary, #006EB3)'; }}
                >
                  {loading ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
            )}
          </form>

        </div>

      </div>
    </div>
  );
}
