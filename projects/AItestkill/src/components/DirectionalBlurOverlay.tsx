import type { CSSProperties } from 'react';
import { useGameStore } from '../store/useGameStore';

export function DirectionalBlurOverlay() {
  const phase = useGameStore((state) => state.phase);
  const sensory = useGameStore((state) => state.sensory);
  const isFocusingHearing = useGameStore((state) => state.isFocusingHearing);

  if (phase !== 'playing') {
    return null;
  }

  const leftActive = sensory.leftIntensity > 0.03;
  const rightActive = sensory.rightIntensity > 0.03;

  const leftStyle: CSSProperties = {
    width: `${Math.round(70 + sensory.leftIntensity * 170)}px`,
    opacity: leftActive ? Math.min(0.92, 0.18 + sensory.leftIntensity * 0.74) : 0,
    backdropFilter: `blur(${(2 + sensory.leftIntensity * 14).toFixed(1)}px)`,
    WebkitBackdropFilter: `blur(${(2 + sensory.leftIntensity * 14).toFixed(1)}px)`,
    animationDuration: `${(1 / Math.max(1.2, sensory.leftPulseHz)).toFixed(2)}s`,
  };

  const rightStyle: CSSProperties = {
    width: `${Math.round(70 + sensory.rightIntensity * 170)}px`,
    opacity: rightActive ? Math.min(0.92, 0.18 + sensory.rightIntensity * 0.74) : 0,
    backdropFilter: `blur(${(2 + sensory.rightIntensity * 14).toFixed(1)}px)`,
    WebkitBackdropFilter: `blur(${(2 + sensory.rightIntensity * 14).toFixed(1)}px)`,
    animationDuration: `${(1 / Math.max(1.2, sensory.rightPulseHz)).toFixed(2)}s`,
  };

  return (
    <div
      className={isFocusingHearing ? 'sensory-blur-layer hearing-active' : 'sensory-blur-layer'}
      aria-hidden="true"
    >
      <div
        className={leftActive ? 'sensory-edge sensory-edge-left active' : 'sensory-edge sensory-edge-left'}
        style={leftStyle}
      />
      <div
        className={rightActive ? 'sensory-edge sensory-edge-right active' : 'sensory-edge sensory-edge-right'}
        style={rightStyle}
      />
    </div>
  );
}
