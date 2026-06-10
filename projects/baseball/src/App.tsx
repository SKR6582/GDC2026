import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { SceneManager } from './three/SceneManager';
import { ScoreBoard } from './components/ScoreBoard';
import { Diamond } from './components/Diamond';
import { PitchInfo } from './components/PitchInfo';
import { PlayerInfo } from './components/PlayerInfo';
import { EventPopup } from './components/EventPopup';
import { GameControls } from './components/GameControls';
import { InningBoard } from './components/InningBoard';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneManager | null>(null);
  const latestEvents = useGameStore(s => s.latestEvents);
  const status = useGameStore(s => s.status);
  const isTop = useGameStore(s => s.isTop);
  const [showInningBoard, setShowInningBoard] = useState(false);
  const [aerialLocked, setAerialLocked] = useState(false);
  const prevIsTop = useRef(isTop);

  // Init Three.js scene
  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    sceneRef.current = new SceneManager(canvasRef.current);

    const handleResize = () => {
      if (canvasRef.current && sceneRef.current) {
        sceneRef.current.resize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Handle game events → 3D scene
  useEffect(() => {
    if (!sceneRef.current || latestEvents.length === 0) return;
    for (const event of latestEvents) {
      sceneRef.current.handleEvent(event);
    }
  }, [latestEvents]);


  // Event log (latest 8)
  const log = useGameStore(s => s.log);
  const recentLog = log.slice(-8).reverse();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Canvas */}
      <div ref={canvasRef} className="canvas-container" />

      {/* HUD Overlay */}
      <div className="hud-overlay">
        {/* Top Left: ScoreBoard + Diamond */}
        <div style={{ position: 'absolute', top: 20, left: 'var(--safe-zone)' }}>
          <ScoreBoard />
          <Diamond />
        </div>

        {/* Top Right: Pitch Info */}
        <div style={{ position: 'absolute', top: 20, right: 'var(--safe-zone)' }}>
          <PitchInfo />
        </div>

        {/* Center: Event Popup */}
        <EventPopup />

        {/* Bottom Left: Event Log */}
        <div style={{
          position: 'absolute', bottom: 110, left: 'var(--safe-zone)',
          display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 380,
        }}>
          {recentLog.map((ev, i) => (
            <div key={ev.timestamp + i} className="animate-fade" style={{
              fontSize: 12, color: 'var(--on-surface-variant)',
              opacity: 1 - i * 0.1,
              padding: '3px 10px',
              background: i === 0 ? 'rgba(254,101,0,0.12)' : 'rgba(18,19,26,0.5)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: i === 0 ? '2px solid var(--secondary-container)' : '2px solid transparent',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {ev.descriptionKo}
            </div>
          ))}
        </div>

        {/* Bottom Center: Inning Board Toggle & Aerial View Lock */}
        <div style={{
          position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowInningBoard(!showInningBoard)} style={{
              background: 'rgba(18,19,26,0.8)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--on-surface-variant)', padding: '6px 14px', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s'
            }}>
              {showInningBoard ? '이닝 보드 닫기' : '이닝 보드'}
            </button>
            <button
              onClick={() => {
                if (sceneRef.current) {
                  const isLocked = sceneRef.current.toggleDebugView();
                  setAerialLocked(isLocked);
                }
              }}
              style={{
                background: aerialLocked ? 'rgba(254,101,0,0.85)' : 'rgba(18,19,26,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: aerialLocked ? '#ffffff' : 'var(--on-surface-variant)',
                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              {aerialLocked ? '항공뷰 고정 해제' : '항공뷰 고정'}
            </button>
          </div>
          {showInningBoard && (
            <div>
              <InningBoard />
            </div>
          )}
        </div>

        {/* Bottom Bar: Player Info + Controls */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }}>
          <PlayerInfo />
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '8px 0 12px',
            background: 'rgba(18,19,26,0.92)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <GameControls />
          </div>
        </div>

        {/* Game End Overlay */}
        {status === 'ended' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 30,
          }}>
            <div className="font-score animate-pop" style={{ fontSize: 72, color: '#ffd600', letterSpacing: '0.08em' }}>
              GAME OVER
            </div>
            <div style={{ fontSize: 20, color: 'var(--on-surface)', marginTop: 8 }}>
              {useGameStore.getState().winner === 'samsung' ? '삼성 라이온즈' : '한화 이글스'} 승리!
            </div>
            <div style={{ marginTop: 20 }}>
              <GameControls />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
