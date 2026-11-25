import type { FormEvent } from 'react';

interface StartModalProps {
  studentId: string;
  durationSeconds: number;
  starting: boolean;
  startError: string | null;
  onStudentIdChange: (value: string) => void;
  onDurationChange: (seconds: number) => void;
  onSubmit: (event: FormEvent) => void;
}

export function StartModal({
  studentId,
  durationSeconds,
  starting,
  startError,
  onStudentIdChange,
  onDurationChange,
  onSubmit,
}: StartModalProps) {
  return (
    <div className="modal-backdrop">
      <form className="modal-card modal-wide" onSubmit={onSubmit}>
        <h1>AItestkill 시험 감독 시뮬레이션</h1>
        <p className="modal-desc">
          3D 고사장 복도를 순찰하며 시력(우클릭 집중 응시)과 화면 좌우 소음 흐림(Space 집중 청음)으로 부정행위자를 적발하세요.
        </p>

        <table className="clue-guide-table">
          <thead>
            <tr>
              <th>유형</th>
              <th>핵심 관찰 단서</th>
              <th>주의 사항</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>촬영 LED AI안경 + 이어폰</td>
              <td>안경 모서리 백색 촬영 LED 점멸, 귓구멍 누름, 풀이 없는 OMR</td>
              <td>고주파 좌/우 흐림</td>
            </tr>
            <tr>
              <td>안경 바꿔치기 스마트안경</td>
              <td>책상 위 교체용 여분 안경, 두꺼운 테 청록색 HUD 광원</td>
              <td>접근 시 급히 벗음</td>
            </tr>
            <tr>
              <td>단추 카메라 + 책상 밑 손</td>
              <td>두 번째 단추 카메라 렌즈, 왼손 책상 밑 송신 동작</td>
              <td>헛기침·속삭임 흐림</td>
            </tr>
            <tr>
              <td>볼펜 스캐너 카메라</td>
              <td>줄 단위 수평 스캔과 청색 스캔선, 펜 클립 상단 렌즈</td>
              <td>문제지 여백 백지</td>
            </tr>
            <tr>
              <td>일반 및 암산형 응시생</td>
              <td>일반 안경 올림, 볼펜 딸깍임, 풀이가 적은 암산형 포함</td>
              <td>기기·시험지 교차 확인</td>
            </tr>
          </tbody>
        </table>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="student-id">학번</label>
            <input
              id="student-id"
              type="text"
              maxLength={32}
              placeholder="예: 20261234"
              value={studentId}
              onChange={(e) => onStudentIdChange(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="duration-select">시험 제한 시간</label>
            <select
              id="duration-select"
              value={durationSeconds}
              onChange={(e) => onDurationChange(Number(e.target.value))}
            >
              <option value={180}>3분 (180초)</option>
              <option value={240}>4분 (240초)</option>
              <option value={300}>5분 (300초)</option>
            </select>
          </div>
        </div>

        <p className="modal-hint">
          조작: WASD 이동 | 우클릭 0.5초 집중 응시 후 E 키 적발 | Space 집중 청음 | 1·2 보조 도구 | F9 즉시 초기화
        </p>

        {startError ? <div className="error-banner">{startError}</div> : null}

        <div className="button-row">
          <button type="submit" className="btn-primary" disabled={starting}>
            {starting ? '시작 중...' : '감독 시작'}
          </button>
          <a className="btn-secondary" href="/?view=board" target="_blank" rel="noreferrer">
            전광판 보기
          </a>
        </div>
      </form>
    </div>
  );
}
