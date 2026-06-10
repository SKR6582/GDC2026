# KBO 야구 시뮬레이션 — 시스템 설계서 & 프롬프트 가이드

---

## 0. 아키텍처 개요

```
Electron (Main Process)
└── BrowserWindow
    └── Vite + React (Renderer Process)
        ├── Zustand Store       ← 전역 게임 상태
        ├── Game Engine (TS)    ← 순수 시뮬레이션 로직
        └── React Components    ← UI 렌더링
```

Main ↔ Renderer IPC 최소화.
게임 로직 전부 Renderer 내 TS 모듈로 처리.

---

## 1. 디렉토리 구조

```
src/
├── engine/
│   ├── simulator.ts       ← 핵심 게임 루프
│   ├── pitch.ts           ← 투구 판정 로직
│   ├── hit.ts             ← 타격 판정 로직
│   ├── baserunner.ts      ← 주자 이동 로직
│   └── probability.ts     ← 확률 테이블 + 스탯 변환
├── store/
│   └── gameStore.ts       ← Zustand 전역 상태
├── data/
│   ├── samsung.ts         ← 삼성 라이온즈 선수 데이터
│   ├── hanwha.ts          ← 한화 이글스 선수 데이터
│   └── types.ts           ← Pitcher / Batter 타입
├── components/
│   ├── ScoreBoard.tsx
│   ├── Diamond.tsx
│   ├── PitchInfo.tsx
│   ├── PlayerInfo.tsx
│   ├── EventPopup.tsx
│   └── Stadium.tsx
└── App.tsx
```

---

## 2. 타입 정의 (types.ts)

```typescript
// 선수 타입 (기존 정의 그대로)
export type TeamId = 'samsung' | 'hanwha';
export type PitcherRole = 'SP' | 'RP' | 'CL';
export type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

export interface Pitcher { ... }  // data/types.ts 참조
export interface Batter { ... }   // data/types.ts 참조

// 게임 이벤트 타입
export type PitchResult =
  | 'strike_swing'
  | 'strike_looking'
  | 'ball'
  | 'foul'
  | 'in_play';

export type HitResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'ground_out'
  | 'fly_out'
  | 'strikeout'
  | 'walk'
  | 'double_play';

export type PitchType =
  | '직구'
  | '슬라이더'
  | '커브'
  | '체인지업'
  | '포크볼';

export interface GameEvent {
  type: PitchResult | HitResult;
  pitchType?: PitchType;
  speed?: number;              // km/h
  description: string;         // 중계 자막용 텍스트
  baseState: BaseState;
  score: Score;
  count: Count;
}

export interface BaseState {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface Count {
  strikes: number;   // 0~2
  balls: number;     // 0~3
  outs: number;      // 0~2
}

export interface Score {
  samsung: number;
  hanwha: number;
}

export interface GameState {
  inning: number;              // 1~9
  isTop: boolean;              // true=초(원정공격), false=말(홈공격)
  count: Count;
  score: Score;
  baseState: BaseState;
  currentBatter: Batter;
  currentPitcher: Pitcher;
  batterIndex: number;         // 현재 타순 인덱스
  log: GameEvent[];
  status: 'idle' | 'playing' | 'paused' | 'ended';
  speed: number;               // 1 | 2 | 4 (배속)
}
```

---

## 3. 확률 엔진 (probability.ts)

### 스탯 → 확률 변환 공식

```
타자 타율(avg) + 투수 ERA 보정으로 실제 안타 확률 계산.

보정 공식:
  ERA 리그 평균 = 4.50 (KBO 기준)
  투수 보정 계수 = ERA / 리그평균ERA
  보정된 안타율 = avg / 투수보정계수

예시:
  타자 avg=0.301, 투수 ERA=3.21
  보정계수 = 3.21 / 4.50 = 0.713
  보정 안타율 = 0.301 / 0.713 ≈ 0.422  ← 인플레이 시 안타 확률
```

### 투구 판정 확률 테이블

```
투구 결과 확률 (고정값, 추후 선수별 조정 가능):
  strike_looking : 0.20
  strike_swing   : 0.15
  ball           : 0.30
  foul           : 0.15
  in_play        : 0.20

투수 WHIP 보정:
  WHIP < 1.10 → ball 확률 -0.05, strike 확률 +0.05
  WHIP > 1.40 → ball 확률 +0.05, strike 확률 -0.05
```

### 타격 결과 확률 테이블 (in_play 시)

```
인플레이 발생 후 결과 확률 (보정된 안타율 기반):
  안타 여부: 보정된 안타율로 판정
  안타 시 타입 분포:
    single    : 0.65
    double    : 0.20
    triple    : 0.03
    homerun   : 0.12  ← 타자 HR/AB 비율로 보정
  아웃 시 타입 분포:
    ground_out  : 0.55
    fly_out     : 0.35
    double_play : 0.10 (주자 1루 있을 때만)
```

---

## 4. 게임 엔진 프롬프트

### 4-1. 투구 판정 (pitch.ts)

```
TypeScript로 KBO 야구 시뮬레이션 투구 판정 모듈 작성.

함수: resolvePitch(pitcher: Pitcher, batter: Batter, count: Count): PitchEvent

PitchEvent = {
  result: PitchResult,
  pitchType: PitchType,
  speed: number
}

로직:
1. 투수 WHIP 기반으로 확률 테이블 보정
2. 가중 랜덤으로 PitchResult 결정
3. 투수 구종 레퍼토리에서 PitchType 랜덤 선택
4. 구종별 구속 범위에서 speed 랜덤 결정:
   직구: 140~155 km/h
   슬라이더: 125~138 km/h
   커브: 110~125 km/h
   체인지업: 120~132 km/h
   포크볼: 118~130 km/h
5. count 상황 반영:
   2스트라이크 → foul 확률 증가
   3볼 → strike 확률 약간 증가 (투수 신중)
   풀카운트 → in_play 확률 증가

UI 코드 없이 순수 로직만. 난수는 Math.random() 사용.
```

### 4-2. 타격 판정 (hit.ts)

```
TypeScript로 KBO 야구 시뮬레이션 타격 판정 모듈 작성.

함수: resolveHit(pitcher: Pitcher, batter: Batter, baseState: BaseState): HitResult

로직:
1. probability.ts의 보정된 안타율 계산
2. 안타/아웃 판정
3. 안타 시: 타자 HR/타수 비율 기반 홈런 확률 추가 보정
4. 아웃 시: 주자 상황 기반 병살 확률 계산
5. HitResult 반환

UI 코드 없이 순수 로직만.
```

### 4-3. 주자 이동 (baserunner.ts)

```
TypeScript로 주자 이동 로직 작성.

함수: advanceRunners(
  result: HitResult,
  baseState: BaseState,
  score: Score,
  battingTeam: TeamId
): { newBaseState: BaseState, newScore: Score, runsScored: number }

규칙:
- single: 주자 전원 2베이스 전진, 타자 1루
- double: 주자 전원 홈, 타자 2루 (1루 주자는 상황에 따라 3루 가능)
- triple: 주자 전원 홈, 타자 3루
- homerun: 주자 + 타자 전원 홈
- ground_out: 주자 1베이스 전진, 타자 아웃
- fly_out: 주자 이동 없음, 타자 아웃
- double_play: 타자+1루 주자 아웃, 나머지 1베이스 전진
- walk: 주자 밀어내기 규칙 적용

runsScored: 이 플레이에서 득점한 수
```

### 4-4. 메인 시뮬레이터 (simulator.ts)

```
TypeScript로 KBO 야구 시뮬레이션 메인 루프 작성.

함수: runGameLoop(
  state: GameState,
  onEvent: (event: GameEvent) => void
): void

동작:
1. 현재 count 상태에서 resolvePitch() 호출
2. 결과에 따라 count 업데이트
3. in_play 시 resolveHit() → advanceRunners() 순서로 처리
4. 삼진/볼넷/아웃 처리
5. 3아웃 시 공수 교대 (isTop 반전, count 리셋)
6. 9이닝 종료 시 status='ended'
7. 매 이벤트마다 onEvent 콜백으로 GameEvent emit

타순 관리:
  batterIndex 0~8 순환
  이닝 교대 시 batterIndex 유지 (이어서 타격)

UI 코드 없이 순수 로직만.
```

---

## 5. Zustand 스토어 프롬프트

```
TypeScript + Zustand로 KBO 시뮬레이션 전역 상태 스토어 작성.

파일: store/gameStore.ts

State: GameState (types.ts 참조)

Actions:
  initGame(homeTeam: TeamId, awayTeam: TeamId): void
    → 초기 상태 세팅, 선수 배치

  startGame(): void
    → status='playing', 게임 루프 시작
    → setInterval로 speed에 맞춰 runGameLoop 호출

  pauseGame(): void
    → status='paused', interval 정지

  setSpeed(speed: 1 | 2 | 4): void
    → interval 딜레이 변경:
       1x = 3000ms, 2x = 1500ms, 4x = 750ms

  applyEvent(event: GameEvent): void
    → 이벤트 기반으로 state 업데이트
    → log에 이벤트 추가

  resetGame(): void
    → 초기 상태로 완전 리셋
```

---

## 6. 시스템 개발 순서

```
Step 1: types.ts              → 타입 전체 정의
Step 2: data/ 선수 데이터     → samsung.ts, hanwha.ts
Step 3: probability.ts        → 확률 변환 공식
Step 4: pitch.ts              → 투구 판정
Step 5: hit.ts                → 타격 판정
Step 6: baserunner.ts         → 주자 이동
Step 7: simulator.ts          → 메인 루프 통합
Step 8: gameStore.ts          → Zustand 스토어
Step 9: UI 컴포넌트 연결       → 디자인 설계서 참조
```

---

## 7. 통합 프롬프트 (Step 9용)

```
기존 작성된 게임 엔진(simulator.ts)과 스토어(gameStore.ts)를
React 컴포넌트들과 연결하는 App.tsx 작성.

요구사항:
- useGameStore()로 전역 상태 구독
- onEvent 콜백에서 applyEvent() 호출
- EventPopup: 이벤트 타입 감지 후 2.5초 표시
- PitchInfo: in_play 또는 strike/ball 이벤트 시 표시
- ScoreBoard: score, count, inning 실시간 반영
- Diamond: baseState 변화 시 애니메이션 트리거
- PlayerInfo: 타순 변경, 이닝 교대 시 슬라이드

하단 컨트롤 바:
  [시작] [일시정지] [1x] [2x] [4x] 버튼
  현재 경기 이닝/점수 텍스트 표시
```

---

## 8. 중계 자막 텍스트 생성 가이드

GameEvent.description 문자열 포맷:

```
투구 이벤트:
  strike_swing   → "{투수명}의 {구종}, 헛스윙 스트라이크!"
  strike_looking → "{구속}km/h {구종}, 루킹 스트라이크."
  ball           → "볼. {볼카운트}볼 {스트라이크카운트}스트라이크."
  foul           → "파울볼."

타격 이벤트:
  single         → "{타자명}, 안타! {득점시: X점 득점!}"
  double         → "{타자명}, 2루타!"
  triple         → "{타자명}, 3루타!"
  homerun        → "{타자명}, 홈런! {득점수}점 홈런!"
  strikeout      → "{타자명}, 삼진 아웃."
  walk           → "볼넷. {타자명} 1루로."
  ground_out     → "{타자명}, 땅볼 아웃."
  fly_out        → "{타자명}, 플라이 아웃."
  double_play    → "병살타! {공수교대시: X아웃}"
```
