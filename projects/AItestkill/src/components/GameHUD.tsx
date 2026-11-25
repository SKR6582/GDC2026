import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

interface GameHUDProps {
  onRequestLock: () => void;
}

export function GameHUD({ onRequestLock }: GameHUDProps) {
  const studentId = useGameStore((state) => state.studentId);
  const remainingSeconds = useGameStore((state) => state.remainingSeconds);
  const hearts = useGameStore((state) => state.hearts);
  const score = useGameStore((state) => state.score);
  const combo = useGameStore((state) => state.combo);
  const caughtCount = useGameStore((state) => state.caughtCount);
  const totalCheaters = useGameStore((state) => state.totalCheaters);
  const activeTool = useGameStore((state) => state.activeTool);
  const isFocusingSight = useGameStore((state) => state.isFocusingSight);
  const isFocusingHearing = useGameStore((state) => state.isFocusingHearing);
  const targetedSeatLabel = useGameStore((state) => state.targetedSeatLabel);
  const targetedDistance = useGameStore((state) => state.targetedDistance);
  const lockProgress = useGameStore((state) => state.lockProgress);
  const canAccuse = useGameStore((state) => state.canAccuse);
  const pointerLocked = useGameStore((state) => state.pointerLocked);
  const sensory = useGameStore((state) => state.sensory);
  const verdictFeedback = useGameStore((state) => state.verdictFeedback);
  const clearFeedback = useGameStore((state) => state.clearFeedback);

  useEffect(() => {
    if (!verdictFeedback) {
      return;
    }
    const delayMs = verdictFeedback.kind === 'info' ? 2400 : 3800;
    const timer = window.setTimeout(() => {
      clearFeedback(verdictFeedback.id);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [verdictFeedback, clearFeedback]);

  return (
    <div className="hud-layer">
      <div className="hud-top">
        <div className="hud-panel hud-row">
          <div>
            <span className="hud-label">학번</span>
            <span className="hud-value">{studentId}</span>
          </div>
          <div>
            <span className="hud-label">감독관 체력</span>
            <div className="hearts-track">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={index < hearts ? 'heart-box' : 'heart-box lost'}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="hud-label">검거 현황</span>
            <span className="hud-value">
              {caughtCount} / {totalCheaters}
            </span>
          </div>
          <div>
            <span className="hud-label">연속 검거</span>
            <span className="hud-value">{combo}콤보</span>
          </div>
        </div>

        <div className="hud-panel hud-row">
          <div>
            <span className="hud-label">남은 시간</span>
            <span className={remainingSeconds <= 30 ? 'hud-value danger-text' : 'hud-value'}>
              {formatClock(remainingSeconds)}
            </span>
          </div>
          <div>
            <span className="hud-label">점수</span>
            <span className="hud-value">{score.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div
        className={
          canAccuse
            ? 'crosshair ready'
            : isFocusingSight
              ? 'crosshair focused'
              : 'crosshair'
        }
      />

      {targetedSeatLabel ? (
        <div className="target-badge">
          <div>
            좌석 {targetedSeatLabel}
            {targetedDistance !== null ? ` (${targetedDistance.toFixed(1)}m)` : ''}
            {canAccuse ? ' | E 적발 준비됨' : ''}
          </div>
          {isFocusingSight || lockProgress > 0 ? (
            <div className="lock-progress-track">
              <div
                className={canAccuse ? 'lock-progress-fill ready' : 'lock-progress-fill'}
                style={{ width: `${Math.round(lockProgress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {verdictFeedback ? (
        <div className={`feedback-banner feedback-${verdictFeedback.kind}`}>
          <div className="feedback-title">
            {verdictFeedback.seatLabel ? `[${verdictFeedback.seatLabel}] ` : ''}
            {verdictFeedback.title}
          </div>
          <div className="feedback-reason">{verdictFeedback.reason}</div>
        </div>
      ) : null}

      {!pointerLocked ? (
        <button type="button" className="lock-banner" onClick={onRequestLock}>
          클릭하여 1인칭 시점 제어로 복귀 (F9: 즉시 초기화)
        </button>
      ) : null}

      <div className="hud-bottom">
        <div className="hud-panel controls-legend">
          WASD 이동 | Shift 빠른 이동 | 우클릭(0.5초) + E 적발 | Space 집중 청음 | 1·2 보조 도구 | F9 즉시 초기화
          {isFocusingSight ? ' | 집중 응시 중' : ''}
          {isFocusingHearing ? ' | 집중 청음 중' : ''}
        </div>

        <div className="hud-tools-row">
          <div className={activeTool === 'rf_detector' ? 'tool-card active' : 'tool-card'}>
            <div className="tool-header">
              <span>[1] 전파 감지기</span>
              <span className="mono-cell">{sensory.rfBattery}%</span>
            </div>
            <div className="rf-bars">
              {[1, 2, 3].map((level) => (
                <span
                  key={level}
                  className={
                    activeTool === 'rf_detector' && sensory.rfBars >= level
                      ? 'rf-bar lit'
                      : 'rf-bar'
                  }
                />
              ))}
            </div>
          </div>

          <div className={activeTool === 'spotlight' ? 'tool-card active' : 'tool-card'}>
            <div className="tool-header">
              <span>[2] 스팟 라이트</span>
              <span className="mono-cell">{sensory.spotlightBattery}%</span>
            </div>
            <div className="tool-sub">
              {sensory.spotlightCooldown > 0
                ? `재충전 ${sensory.spotlightCooldown.toFixed(1)}초`
                : '좌클릭 조사 가능'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
