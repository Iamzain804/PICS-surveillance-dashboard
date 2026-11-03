import React from 'react';
import { FileSpreadsheet, Download, Play, CheckCircle, Database } from 'lucide-react';

export default function ReportPanel({ onGenerateReport, isGenerating }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--success)'
        }}>
          <FileSpreadsheet size={28} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Excel Attendance Report Engine</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Generates multi-sheet Excel reports with 3-min event clustering, check-in/out pairing & working hours calculation.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button 
          onClick={onGenerateReport} 
          disabled={isGenerating}
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
        >
          <Download size={18} />
          {isGenerating ? 'Generating Excel Report...' : 'Generate & Download Excel Report'}
        </button>
      </div>
    </div>
  );
}
