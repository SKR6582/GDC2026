import React from 'react';
import { useGameStore } from '../store/gameStore';

export const Diamond: React.FC = () => {
  const { baseState } = useGameStore();
  const pState = useGameStore(s => s.isTop ? s.homePitcherState : s.awayPitcherState);

  return (
    <div className="glass animate-slide-left" style={{
      display: 'flex', alignItems: 'center', gap: 24, padding: '12px 16px',
      marginTop: 12, width: 'fit-content',
    }}>
      {/* Diamond graphic */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        {/* 2nd */}
        <div className={`diamond-base ${baseState.second ? 'active' : ''}`}
          style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }} />
        {/* 3rd */}
        <div className={`diamond-base ${baseState.third ? 'active' : ''}`}
          style={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%) rotate(45deg)' }} />
        {/* 1st */}
        <div className={`diamond-base ${baseState.first ? 'active' : ''}`}
          style={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%) rotate(45deg)' }} />
        {/* Home */}
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 12, height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 2,
        }} />
      </div>

      {/* Pitch count */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pitch Count
        </span>
        <span className="font-mono" style={{ fontSize: 22, color: 'var(--primary)', fontWeight: 700 }}>
          {pState.pitchCount}
        </span>
      </div>
    </div>
  );
};
