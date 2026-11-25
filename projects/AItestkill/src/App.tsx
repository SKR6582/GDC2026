import { useEffect, useRef, useState, type FormEvent } from 'react';
import { startSession, submitScore } from './api/scoreApi';
import { DirectionalBlurOverlay } from './components/DirectionalBlurOverlay';
import { GameHUD } from './components/GameHUD';
import { ResultModal } from './components/ResultModal';
import { ScoreboardView } from './components/ScoreboardView';
import { StartModal } from './components/StartModal';
import { ClassroomScene } from './game/ClassroomScene';
import { useGameStore } from './store/useGameStore';

export function App() {
  const isBoardMode = new URLSearchParams(window.location.search).get('view') === 'board';
  if (isBoardMode) {
    return <ScoreboardView />;
  }

  return <GameView />;
}

function GameView() {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<ClassroomScene | null>(null);

  const phase = useGameStore((state) => state.phase);
  const sessionId = useGameStore((state) => state.sessionId);
  const lastSummary = useGameStore((state) => state.lastSummary);

  const [inputStudentId, setInputStudentId] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(240);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) {
      return;
    }
    const classroom = new ClassroomScene(host);
    sceneRef.current = classroom;
    return () => {
      classroom.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'ended' || !lastSummary) {
      return;
    }

    let cancelled = false;
    setSubmitStatus('점수 전송 중...');

    submitScore({
      sessionId: sessionId ?? undefined,
      studentId: lastSummary.studentId,
      score: lastSummary.score,
      caughtCount: lastSummary.caughtCount,
      totalCheaters: lastSummary.totalCheaters,
      wrongCatchCount: lastSummary.wrongCatchCount,
      remainingHearts: lastSummary.remainingHearts,
      elapsedSeconds: lastSummary.elapsedSeconds,
      clearedAll: lastSummary.clearedAll,
    })
      .then((result) => {
        if (cancelled) return;
        const bestNote = result.isPersonalBest
          ? '개인 최고 점수 갱신'
          : `개인 최고 ${result.bestScore.toLocaleString()}점 유지`;
        setSubmitStatus(`전송 완료 (순위 ${result.rank}위 | ${bestNote})`);
      })
      .catch((error) => {
        if (cancelled) return;
        setSubmitStatus(
          error instanceof Error ? `전송 실패: ${error.message}` : '전송 실패',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [phase, lastSummary, sessionId]);

  const handleStart = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inputStudentId.trim();
    if (!trimmed) {
      setStartError('학번을 입력해 주세요.');
      return;
    }

    setStarting(true);
    setStartError(null);
    setSubmitStatus(null);

    try {
      const session = await startSession(trimmed, durationSeconds);
      useGameStore.getState().beginRun({
        studentId: session.studentId,
        sessionId: session.sessionId,
        durationSeconds: session.durationLimitSeconds,
        totalCheaters: 8,
      });
      sceneRef.current?.startSessionRun(8);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : '세션 시작에 실패했습니다.');
    } finally {
      setStarting(false);
    }
  };

  const handleRestart = () => {
    sceneRef.current?.stopSessionRun();
    useGameStore.getState().resetToIdle();
  };

  return (
    <div className="game-shell">
      <div ref={canvasHostRef} className="scene-canvas-host" />

      <DirectionalBlurOverlay />

      {phase === 'playing' ? (
        <GameHUD onRequestLock={() => sceneRef.current?.requestPointerLock()} />
      ) : null}

      {phase === 'idle' ? (
        <StartModal
          studentId={inputStudentId}
          durationSeconds={durationSeconds}
          starting={starting}
          startError={startError}
          onStudentIdChange={setInputStudentId}
          onDurationChange={setDurationSeconds}
          onSubmit={handleStart}
        />
      ) : null}

      {phase === 'ended' && lastSummary ? (
        <ResultModal
          summary={lastSummary}
          submitStatus={submitStatus}
          onRestart={handleRestart}
        />
      ) : null}
    </div>
  );
}
