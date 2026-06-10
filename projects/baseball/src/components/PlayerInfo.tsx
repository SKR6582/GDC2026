import React from 'react';
import { useGameStore } from '../store/gameStore';

export const PlayerInfo: React.FC = () => {
  const { isTop, awayTeam, homeTeam, awayBatterIndex, homeBatterIndex, homePitcherState, awayPitcherState } = useGameStore();

  const battingTeam = isTop ? awayTeam : homeTeam;
  const batterIdx = isTop ? awayBatterIndex : homeBatterIndex;
  const batter = battingTeam.lineup[batterIdx % battingTeam.lineup.length];

  const pitcherState = isTop ? homePitcherState : awayPitcherState;
  const pitcher = pitcherState.pitcher;

  const teamColor = battingTeam.color;
  const pitchTeamColor = isTop ? homeTeam.color : awayTeam.color;

  return (
    <div className="animate-slide-up" style={{
      display: 'flex', alignItems: 'center',
      height: 72,
      background: `linear-gradient(90deg, rgba(18,19,26,0.95) 0%, rgba(26,27,34,0.9) 50%, rgba(18,19,26,0.95) 100%)`,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '0 var(--safe-zone)',
    }}>
      {/* Batter section */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${teamColor}22`,
          border: `2px solid ${teamColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: teamColor,
          fontFamily: "'Bebas Neue', sans-serif",
        }}>
          {batterIdx + 1}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10, color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current Batter
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, lineHeight: '24px' }}>
            {batter.nameEn}
          </span>
          <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              AVG <strong style={{ color: 'var(--on-surface)' }}>{batter.avg.toFixed(3)}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              HR <strong style={{ color: 'var(--on-surface)' }}>{batter.homeRuns}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              SPD <strong style={{ color: 'var(--on-surface)' }}>{batter.speed}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Pitcher section */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 24, justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            On Mound
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, lineHeight: '24px' }}>
            {pitcher.nameEn}
          </span>
          <div style={{ display: 'flex', gap: 14, marginTop: 2, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              ERA <strong style={{ color: 'var(--on-surface)' }}>{pitcher.era.toFixed(2)}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              K <strong style={{ color: 'var(--on-surface)' }}>{pitcherState.strikeoutsRecorded}</strong>
            </span>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              PC <strong style={{ color: 'var(--on-surface)' }}>{pitcherState.pitchCount}</strong>
            </span>
          </div>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `${pitchTeamColor}22`,
          border: `2px solid ${pitchTeamColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: pitchTeamColor,
          fontFamily: "'Bebas Neue', sans-serif",
        }}>
          {pitcher.role}
        </div>
      </div>
    </div>
  );
};
