import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ScoreBoard: React.FC = () => {
  const { inning, isTop, count, score, awayTeam, homeTeam } = useGameStore();
  const inningLabel = `${inning}${isTop ? 'ST TOP' : inning === 1 ? 'ST BOT' : inning === 2 ? 'ND BOT' : inning === 3 ? 'RD BOT' : 'TH BOT'}`;
  const inningDisplay = `${inning}${inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th'} ${isTop ? 'TOP' : 'BOT'}`;

  return (
    <div className="glass animate-slide-left" style={{ width: 320, overflow: 'hidden' }}>
      {/* Header: Inning & Count */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px',
        background: 'rgba(52,52,60,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span className="font-score" style={{ fontSize: 14, fontWeight: 700, color: 'var(--secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {inningDisplay}
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Balls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 700 }}>B</span>
            {[0, 1, 2].map(i => <div key={i} className={`led ${i < count.balls ? 'ball' : ''}`} />)}
          </div>
          {/* Strikes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 700 }}>S</span>
            {[0, 1].map(i => <div key={i} className={`led ${i < count.strikes ? 'strike' : ''}`} />)}
          </div>
          {/* Outs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 700 }}>O</span>
            {[0, 1].map(i => <div key={i} className={`led ${i < count.outs ? 'out' : ''}`} />)}
          </div>
        </div>
      </div>

      {/* Team Scores */}
      <div>
        {/* Away team */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: isTop ? 'rgba(7,76,161,0.12)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 4, height: 48, background: awayTeam.color }} />
            <span className="font-score" style={{ marginLeft: 14, fontSize: 20, letterSpacing: '0.04em' }}>
              {awayTeam.abbr}
            </span>
          </div>
          <span className="font-score" style={{ fontSize: 44, padding: '0 20px', lineHeight: '48px' }}>
            {score[awayTeam.id]}
          </span>
        </div>
        {/* Home team */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: !isTop ? 'rgba(254,101,0,0.08)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 4, height: 48, background: homeTeam.color }} />
            <span className="font-score" style={{ marginLeft: 14, fontSize: 20, letterSpacing: '0.04em' }}>
              {homeTeam.abbr}
            </span>
          </div>
          <span className="font-score" style={{ fontSize: 44, padding: '0 20px', lineHeight: '48px' }}>
            {score[homeTeam.id]}
          </span>
        </div>
      </div>
    </div>
  );
};
