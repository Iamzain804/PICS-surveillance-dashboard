import React from 'react';
import { ShieldCheck, RefreshCw, LogOut } from 'lucide-react';

export default function Navbar({ onRefresh, isRefreshing, onLogout, user }) {
  return (
    <header className="app-header">
      <div className="brand-logo">
        <div className="brand-icon">
          <ShieldCheck size={26} color="#059669" />
        </div>
        <div>
          <h1 className="brand-title">EPIC</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            STAFFRFORMANCE INSIGHT COMPLIANCE
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-primary"
          style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border-card)' }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync Logs'}
        </button>

        <div className="system-pulse">
          <span className="pulse-dot"></span>
          <span>Two-Stage Pipeline Active</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--danger)',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
}
