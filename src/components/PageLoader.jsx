import React from 'react';
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      height: '100%',
      width: '100%',
      background: 'var(--bg-main-premium, #f8fafc)'
    }}>
      <style>{`
        @keyframes epicLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--bg-card-premium, #ffffff)',
        boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid var(--border-premium, #e2e8f0)'
      }}>
        <Loader2
          size={28}
          color="#10b981"
          style={{ animation: 'epicLoaderSpin 0.8s linear infinite' }}
        />
      </div>
    </div>
  );
}
