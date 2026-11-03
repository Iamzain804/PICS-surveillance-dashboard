import React from 'react';
import { User, Clock, CheckCircle } from 'lucide-react';
import StaffAvatar from './StaffAvatar';

export default function STAFFCards({ events = [] }) {
  // Aggregate recognized events per STAFF dynamically
  const empMap = {};

  events.forEach(ev => {
    if (ev.recognition_status === 'recognized' && ev.STAFF_name && ev.STAFF_name !== 'Unknown') {
      if (!empMap[ev.STAFF_name]) {
        empMap[ev.STAFF_name] = {
          name: ev.STAFF_name,
          id: ev.STAFF_id ? `EMP-${ev.STAFF_id}` : 'ENROLLED',
          count: 0,
          confSum: 0,
          lastSeen: ev.timestamp
        };
      }
      empMap[ev.STAFF_name].count += 1;
      empMap[ev.STAFF_name].confSum += (ev.recognition_confidence || 0);
    }
  });

  const STAFFList = Object.values(empMap).map(emp => ({
    ...emp,
    avgConf: emp.count > 0 ? `${((emp.confSum / emp.count) * 100).toFixed(1)}%` : '0%'
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>STAFF Directory &amp; Attendance</h2>
        <p style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>
          Enrolled personnel identified across Check-In and Check-Out feeds
        </p>
      </div>

      {STAFFList.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <User size={36} style={{ color: '#059669', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No recognized personnel logged yet in database.</p>
          <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Run <code style={{ background: '#ecfdf5', padding: '0.1rem 0.4rem', borderRadius: '4px', color: '#047857' }}>python main.py</code> to process raw videos and populate attendance cards.</p>
        </div>
      ) : (
        <div className="STAFF-grid">
          {STAFFList.map((emp, idx) => {
            return (
              <div key={idx} className="glass-card STAFFrd" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <StaffAvatar name={emp.name} size={48} />
                  <div className="emp-info">
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.1rem' }}>{emp.name}</h3>
                    <span className="emp-id" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{emp.id}</span>
                  </div>
                </div>

                <div className="emp-stats-row" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '0.825rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontWeight: 500 }}>Detections</div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{emp.count} appearance{emp.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontWeight: 500 }}>Avg Accuracy</div>
                    <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>{emp.avgConf}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', marginTop: '0.4rem' }}>
                  <span className="badge" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle size={12} /> Active
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                    <Clock size={12} /> {emp.lastSeen ? emp.lastSeen.split(' ')[1] || emp.lastSeen : 'Today'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
