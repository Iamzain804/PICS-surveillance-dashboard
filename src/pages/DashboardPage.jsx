import React from 'react';
import { Clock, LayoutDashboard } from 'lucide-react';
import PageHeader from '../components/PageHeader';

export default function DashboardPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      <PageHeader title="Dashboard" icon={LayoutDashboard} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

      {/* ── Simple Minimal Coming Soon Card ── */}
      <div style={{
        flex: 1,
        background: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center'
      }}>
        
        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#10b981',
          marginBottom: '1.5rem'
        }}>
          <Clock size={32} />
        </div>

        {/* Simple Heading */}
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 0.5rem 0'
        }}>
          Coming Soon
        </h2>

        {/* Natural Subtitle */}
        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          maxWidth: '420px',
          margin: 0,
          lineHeight: '1.5'
        }}>
          We are currently working on the executive dashboard. This section will be available soon.
        </p>

      </div>

      </div>

    </div>
  );
}
