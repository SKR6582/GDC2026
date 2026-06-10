import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { GameEvent, HitResult } from '../engine/types';

const BIG_EVENTS: Set<string> = new Set([
  'homerun', 'triple', 'double', 'strikeout', 'walk', 'hit_by_pitch',
  'double_play', 'sacrifice_fly', 'error',
]);

const EVENT_LABELS: Record<string, { text: string; color: string }> = {
  homerun: { text: 'HOME RUN!', color: '#ff4d4d' },
  triple: { text: '3루타!', color: '#ffd600' },
  double: { text: '2루타!', color: '#bcc3ff' },
  single: { text: '안타!', color: '#4ade80' },
  strikeout: { text: '삼진!', color: '#ff4d4d' },
  walk: { text: '볼넷', color: '#ffd600' },
  hit_by_pitch: { text: '사구!', color: '#ff7f5d' },
  double_play: { text: '병살!', color: '#ff4d4d' },
  sacrifice_fly: { text: '희생플라이', color: '#bcc3ff' },
  sacrifice_bunt: { text: '희생번트', color: '#bcc3ff' },
  error: { text: '실책!', color: '#ffb4ab' },
  stolen_base: { text: '도루 성공!', color: '#4ade80' },
  caught_stealing: { text: '도루 실패!', color: '#ff4d4d' },
  pickoff_out: { text: '견제 아웃!', color: '#ff4d4d' },
  balk_advance: { text: '보크!', color: '#ffd600' },
};

export const EventPopup: React.FC = () => {
  const latestEvents = useGameStore(s => s.latestEvents);
  const [visible, setVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [displayLabel, setDisplayLabel] = useState<{ text: string; color: string } | null>(null);

  useEffect(() => {
    if (latestEvents.length === 0) return;

    for (const event of latestEvents) {
      let key = event.hitResult || event.baserunEvent || '';
      if (!key && event.type === 'game_end') key = 'game_end';

      if (EVENT_LABELS[key] || key === 'game_end') {
        setCurrentEvent(event);
        setDisplayLabel(key === 'game_end'
          ? { text: '경기 종료!', color: '#ffd600' }
          : EVENT_LABELS[key]);
        setVisible(true);

        const timer = setTimeout(() => setVisible(false), 2800);
        return () => clearTimeout(timer);
      }
    }
  }, [latestEvents]);

  if (!visible || !currentEvent || !displayLabel) return null;

  return (
    <div className="event-popup">
      <div className="event-text" style={{ color: displayLabel.color }}>
        {displayLabel.text}
      </div>
      {currentEvent.runsScored && currentEvent.runsScored > 0 && (
        <div className="event-sub" style={{ color: '#ffd600', fontSize: 22, fontWeight: 700 }}>
          +{currentEvent.runsScored} 득점!
        </div>
      )}
      <div className="event-sub">
        {currentEvent.descriptionKo}
      </div>
    </div>
  );
};
