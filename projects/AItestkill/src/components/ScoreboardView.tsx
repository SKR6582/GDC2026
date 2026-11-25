import { useEffect, useState } from 'react';
import {
  fetchHealth,
  fetchLeaderboard,
  fetchRecentScores,
  subscribeScoreStream,
} from '../api/scoreApi';
import type { ConnectorHealth, ScoreRecord } from '../types/game';

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = String(Math.floor(total / 60)).padStart(2, '0');
  const secs = String(total % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function ScoreboardView() {
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  const [recent, setRecent] = useState<ScoreRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([fetchLeaderboard(20), fetchRecentScores(10), fetchHealth()])
      .then(([topRows, recentRows, healthInfo]) => {
        if (!active) return;
        setLeaderboard(topRows);
        setRecent(recentRows);
        setHealth(healthInfo);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : '점수 데이터를 불러오지 못했습니다.');
      });

    const unsubscribe = subscribeScoreStream({
      onStatusChange: (isOnline) => {
        if (active) setConnected(isOnline);
      },
      onSnapshot: (payload) => {
        if (!active) return;
        setLeaderboard(payload.leaderboard);
        setRecent(payload.recent);
      },
      onScoreAdded: (payload) => {
        if (!active) return;
        setLeaderboard(payload.leaderboard);
        setRecent(payload.recent);
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>AItestkill 실시간 시험 감독 점수판</h1>
          <p className="board-subtitle">
            순위표: 학번당 최고 점수 1건 표시 | 커넥터: {health ? health.mode : '확인 중'} | 실시간 스트림:{' '}
            {connected ? '연결됨' : '재연결 대기'}
          </p>
        </div>
        <a className="btn-secondary" href="/">
          감독관 게임 화면으로 이동
        </a>
      </header>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <main className="board-grid">
        <section className="board-card">
          <h2>상위 순위표</h2>
          <table className="board-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>학번</th>
                <th>점수</th>
                <th>검거</th>
                <th>잔여 하트</th>
                <th>소요 시간</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    아직 등록된 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                leaderboard.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td className="mono-cell">{item.studentId}</td>
                    <td className="score-cell">{item.score.toLocaleString()}</td>
                    <td>
                      {item.caughtCount} / {item.totalCheaters}
                    </td>
                    <td>{item.remainingHearts} / 3</td>
                    <td className="mono-cell">{formatElapsed(item.elapsedSeconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="board-card">
          <h2>최근 완료 기록</h2>
          <table className="board-table">
            <thead>
              <tr>
                <th>학번</th>
                <th>점수</th>
                <th>결과</th>
                <th>완료 시각</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    최근 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                recent.map((item) => (
                  <tr key={item.id}>
                    <td className="mono-cell">{item.studentId}</td>
                    <td className="score-cell">{item.score.toLocaleString()}</td>
                    <td>{item.clearedAll ? '전원 검거' : '감독 종료'}</td>
                    <td className="mono-cell">
                      {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                        hour12: false,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
