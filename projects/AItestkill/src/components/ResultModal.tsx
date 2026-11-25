import { ARCHETYPE_META } from '../game/ScoreCalculator';
import type { GameSummary } from '../types/game';

interface ResultModalProps {
  summary: GameSummary;
  submitStatus: string | null;
  onRestart: () => void;
}

function getEndTitle(reason: GameSummary['endReason']): string {
  if (reason === 'all_caught') return '부정행위자 전원 검거';
  if (reason === 'out_of_hearts') return '감독관 체력 소진';
  return '시험 시간 종료';
}

function formatSec(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const mins = String(Math.floor(s / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function ResultModal({ summary, submitStatus, onRestart }: ResultModalProps) {
  const { breakdown, logs } = summary;

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-wide modal-scroll">
        <h2>{getEndTitle(summary.endReason)}</h2>
        <p className="modal-desc">
          학번 {summary.studentId} | 최종 점수 {summary.score.toLocaleString()}점 | 검거{' '}
          {summary.caughtCount}/{summary.totalCheaters}명 | 오심 {summary.wrongCatchCount}회 | 잔여 하트{' '}
          {summary.remainingHearts}개 | 소요 시간 {formatSec(summary.elapsedSeconds)}
        </p>

        {submitStatus ? <div className="status-pill">{submitStatus}</div> : null}

        <table className="result-table">
          <thead>
            <tr>
              <th>점수 항목</th>
              <th className="num-col">금액</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>검거 기본 및 콤보 점수</td>
              <td className="num-col">+{breakdown.catchPoints.toLocaleString()}</td>
            </tr>
            <tr>
              <td>신속 검거 보너스</td>
              <td className="num-col">+{breakdown.speedBonusPoints.toLocaleString()}</td>
            </tr>
            <tr>
              <td>조기 완수 보너스</td>
              <td className="num-col">+{breakdown.earlyClearBonus.toLocaleString()}</td>
            </tr>
            <tr>
              <td>잔여 하트 보너스</td>
              <td className="num-col">+{breakdown.heartBonus.toLocaleString()}</td>
            </tr>
            <tr>
              <td>오심 감점</td>
              <td className="num-col">-{breakdown.wrongPenaltyPoints.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {logs.length > 0 ? (
          <div className="log-section">
            <h3>적발 내역</h3>
            <table className="result-table">
              <thead>
                <tr>
                  <th>좌석</th>
                  <th>판정</th>
                  <th>유형 및 단서</th>
                  <th className="num-col">점수 변동</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry, idx) => (
                  <tr key={`${entry.seatLabel}-${idx}`}>
                    <td>{entry.seatLabel}</td>
                    <td>{entry.isCheater ? '정당 적발' : '오심'}</td>
                    <td>
                      {ARCHETYPE_META[entry.archetype].label}: {entry.reason}
                    </td>
                    <td className="num-col">
                      {entry.scoreDelta >= 0
                        ? `+${entry.scoreDelta.toLocaleString()}`
                        : entry.scoreDelta.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="button-row">
          <button type="button" className="btn-primary" onClick={onRestart}>
            다시 시작
          </button>
          <a className="btn-secondary" href="/?view=board" target="_blank" rel="noreferrer">
            전광판 보기
          </a>
        </div>
      </div>
    </div>
  );
}
