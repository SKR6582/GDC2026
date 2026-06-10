import React from 'react';
import { useGameStore } from '../store/gameStore';

export const InningBoard: React.FC = () => {
  const { inning, isTop, inningScores, score } = useGameStore();
  const maxInnings = Math.max(9, inning);
  const innings = Array.from({ length: maxInnings }, (_, i) => i + 1);

  return (
    <div className="glass animate-slide-up" style={{ padding: 10, width: 'fit-content' }}>
      <div className="inning-board" style={{
        gridTemplateColumns: `60px repeat(${maxInnings}, 1fr) repeat(3, 36px)`,
      }}>
        {/* Header row */}
        <div className="cell header" />
        {innings.map(i => (
          <div key={i} className={`cell header ${i === inning ? 'active' : ''}`}>{i}</div>
        ))}
        <div className="cell header" style={{ color: 'var(--on-surface)' }}>R</div>
        <div className="cell header" style={{ color: 'var(--on-surface)' }}>H</div>
        <div className="cell header" style={{ color: 'var(--on-surface)' }}>E</div>

        {/* Away team */}
        <div className="cell" style={{ textAlign: 'left', fontWeight: 600, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: '0.04em' }}>
          SAM
        </div>
        {innings.map(i => (
          <div key={i} className={`cell ${i === inning && isTop ? 'active' : ''}`}>
            {inningScores.samsung[i - 1] !== undefined ? inningScores.samsung[i - 1] : '-'}
          </div>
        ))}
        <div className="cell" style={{ fontWeight: 700 }}>{score.samsung}</div>
        <div className="cell">-</div>
        <div className="cell">-</div>

        {/* Home team */}
        <div className="cell" style={{ textAlign: 'left', fontWeight: 600, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: '0.04em' }}>
          HAN
        </div>
        {innings.map(i => (
          <div key={i} className={`cell ${i === inning && !isTop ? 'active' : ''}`}>
            {inningScores.hanwha[i - 1] !== undefined ? inningScores.hanwha[i - 1] : '-'}
          </div>
        ))}
        <div className="cell" style={{ fontWeight: 700 }}>{score.hanwha}</div>
        <div className="cell">-</div>
        <div className="cell">-</div>
      </div>
    </div>
  );
};
