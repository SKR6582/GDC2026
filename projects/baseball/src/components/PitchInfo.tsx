import React from 'react';
import { useGameStore } from '../store/gameStore';

export const PitchInfo: React.FC = () => {
  const latestEvents = useGameStore(s => s.latestEvents);
  const log = useGameStore(s => s.log);

  // 최근 투구 정보
  const lastPitch = latestEvents.find(e => e.pitchType);
  // 최근 7개 투구 위치
  const recentPitches = log.filter(e => e.pitchLocation).slice(-7);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
      {/* Pitch Sequence */}
      <div className="glass animate-slide-right" style={{ padding: 14, width: 170 }}>
        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Pitch Sequence
        </div>
        <div style={{
          position: 'relative', width: 120, height: 150, margin: '0 auto',
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
        }}>
          {/* Strike zone grid */}
          <div style={{
            position: 'absolute', top: '15%', left: '15%', width: '70%', height: '60%',
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {Array(9).fill(0).map((_, i) => (
              <div key={i} style={{ borderRight: i % 3 < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none', borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.08)' : 'none' }} />
            ))}
          </div>

          {/* Pitch dots */}
          {recentPitches.map((p, i) => {
            const loc = p.pitchLocation!;
            const isLast = i === recentPitches.length - 1;
            // Strike Zone is defined mathematically as [-0.75, 0.75].
            // Visually the grid is left: 15% to 85% (width 70%), and top: 15% to 75% (height 60%).
            const cx = 50 + loc.x * 46.67;
            const cy = 45 - loc.y * 40;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${cx}%`, top: `${cy}%`,
                transform: 'translate(-50%,-50%)',
                width: isLast ? 14 : 10,
                height: isLast ? 14 : 10,
                borderRadius: '50%',
                background: isLast ? 'var(--secondary-container)' : 'var(--tertiary)',
                opacity: isLast ? 1 : 0.4,
                boxShadow: isLast ? '0 0 10px rgba(254,101,0,0.6)' : 'none',
                border: isLast ? '2px solid white' : 'none',
                transition: 'all 0.3s ease',
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--secondary-container)' }} />
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Current</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--tertiary)', opacity: 0.4 }} />
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Prev</span>
          </div>
        </div>
      </div>

      {/* Last pitch speed */}
      {lastPitch && (
        <div className="glass animate-slide-right" style={{
          padding: '14px 18px', textAlign: 'right',
          borderRight: '3px solid var(--secondary-container)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Last Pitch
          </div>
          <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: '38px' }}>
            {lastPitch.speed} <span style={{ fontSize: 14, color: 'var(--on-surface-variant)', fontWeight: 400 }}>km/h</span>
          </div>
          <div className="font-score" style={{ fontSize: 18, color: 'var(--secondary-container)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {lastPitch.pitchType}
          </div>
        </div>
      )}
    </div>
  );
};
