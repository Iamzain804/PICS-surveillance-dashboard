import React from 'react';
import { Video, UserCheck, Eye, Users } from 'lucide-react';

export default function StatsOverview({ stats }) {
  const cards = [
    {
      title: 'Processed Videos',
      value: stats?.totalVideos || 0,
      icon: Video,
      color: '#0284c7'
    },
    {
      title: 'Total Detections',
      value: stats?.totalEvents || 0,

      icon: Eye,
      color: '#6366f1'
    },
    {
      title: 'Recognized Faces',
      value: stats?.recognizedEvents || 0,
      icon: UserCheck,
      color: '#059669'
    },
    {
      title: 'Unique STAFFs',
      value: stats?.uniqueSTAFFs || 0,
      icon: Users,
      color: '#d97706'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="glass-card stat-card">
            <div className="stat-header">
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{card.title}</span>
              <div className="stat-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: card.color }}>
                <Icon size={20} />
              </div>
            </div>
            <div className="stat-value" style={{ color: card.color, fontSize: '1.75rem', fontWeight: 800 }}>
              {card.value.toLocaleString()}
            </div>
            <div className="stat-subtitle" style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
              {card.subtitle}
            </div>
          </div>
        );
      })}
    </div>
  );
}
