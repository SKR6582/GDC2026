import React from 'react';
import { useGameStore } from '../store/gameStore';

export const GameControls: React.FC = () => {
  const { status, speed, startGame, pauseGame, setSpeed, resetGame, stepOnce } = useGameStore();

  return (
    <div className="controls-bar">
      {status !== 'playing' ? (
        <button className="primary" onClick={() => { if (status === 'ended') resetGame(); startGame(); }}>
          {status === 'ended' ? '⟳ 다시' : status === 'idle' ? '▶ 시작' : '▶ 재개'}
        </button>
      ) : (
        <button onClick={pauseGame}>⏸ 일시정지</button>
      )}

      <button onClick={stepOnce} style={{ fontSize: 12 }}>⏭ 1스텝</button>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

      {([1, 2, 4] as const).map(s => (
        <button
          key={s}
          className={speed === s ? 'active' : ''}
          onClick={() => setSpeed(s)}
          style={{ minWidth: 38 }}
        >
          {s}x
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

      <button onClick={resetGame} style={{ fontSize: 12, color: 'var(--error)' }}>리셋</button>
    </div>
  );
};
