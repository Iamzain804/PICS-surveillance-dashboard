import React from 'react';
import { PanelLeft } from 'lucide-react';
import UserProfileHeaderBadge from './UserProfileHeaderBadge';

export default function PageHeader({ title, onToggleSidebar, user, onLogout, onNavigate, sidebarCollapsed }) {
  return (
    <header
      className="pics-page-header"
      style={{
        width: '100%',
        minHeight: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 0',
        background: 'var(--bg-page, #ffffff)',
        borderBottom: '1px solid var(--border-primary, #e2e8f0)',
        boxSizing: 'border-box',
        flexShrink: 0,
        marginBottom: '1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Sidebar Toggle + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="sidebar-toggle-btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-primary, #e2e8f0)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              color: 'var(--text-body, #475569)',
              flexShrink: 0,
              transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease, background 0.15s, color 0.15s, border-color 0.15s',
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft size={19} />
          </button>
        )}

        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-heading, #0f172a)',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: User Profile Controls */}
      <UserProfileHeaderBadge user={user} onLogout={onLogout} onNavigate={onNavigate} />
    </header>
  );
}
