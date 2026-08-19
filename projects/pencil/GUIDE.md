# Pencil Engine 개발 가이드

책상 위 필기구 세계관의 타일 기반 탐험 게임 개발 가이드입니다.

## 프로젝트 구조

```text
main.py                 게임 진입점
settings.py             해상도, TILE_SIZE, 테마
engine/
  map_loader.py         맵 JSON 로드·검증
  map_events.py         이벤트 디스패처
  tilemap_renderer.py   타일맵 렌더링
  game_manager.py       방 번호, 플래그, HP
scenes/
  exploration_scene.py  메인 탐험 씬
  story_scene.py        JSON 대화
assets/data/
  maps/room_N.json      맵 데이터
  rooms.json            방 매니페스트
  stories/roomN.json    입장 스토리
map_editor/             Electron 맵 편집기
grid_aligner/           배경 그리드 정렬 도구
```

## 씬 라이프사이클

모든 씬은 `engine.scene.Scene`을 상속합니다.

- `on_enter()` — 진입 시 초기화
- `handle_input(input_mgr)` — 입력 처리
- `update(dt)` — 로직 업데이트
- `draw(screen)` — 렌더링

## 메인 게임 플로우

```text
TitleScene → StoryScene(room N) → ExplorationScene → [next_room 이벤트] → StoryScene(room N+1)
```

- 스토리 종료 시 `ExplorationScene`으로 전환
- 맵 발판(type 4)의 `next_room` 이벤트로 다음 방 진행
- `dialogue` 이벤트는 `StoryScene`을 push하여 오버레이 대화 후 복귀

## 조작 (탐험 씬)

| 입력 | 동작 |
|------|------|
| WASD / 방향키 | 타일 이동 |
| SPACE | 바라보는 방향 상호작용 (type 3) |
| R | 맵 리로드 (dev_mode만) |
| ESC | 타이틀 복귀 (dev_mode만) |

## 맵 에디터 실행

```bash
cd map_editor
npm install
npm start
```

저장 경로: `assets/data/maps/room_{N}.json`

## 이벤트 작성 예시

```json
{
  "type": 3,
  "event": {
    "trigger": "interact",
    "action": "log",
    "args": { "text": "보물 상자!" }
  }
}
```

```json
{
  "type": 4,
  "event": {
    "trigger": "step",
    "action": "next_room",
    "args": { "target": "story" }
  }
}
```

## 씬 전환 API

```python
# 씬 교체
self.game.scene_manager.change(NextScene(self.game))

# 오버레이 (대화 등)
self.game.scene_manager.push(OverlayScene(self.game))
self.game.scene_manager.pop()
```

## 상태 관리

```python
self.game.state.current_room   # 현재 방
self.game.state.set_flag("key", True)
self.game.state.get_flag("key")
```

## 새 방 추가 체크리스트

1. `map_editor`에서 `room_N.json` 작성·저장
2. `assets/data/rooms.json`에 항목 추가
3. `assets/data/stories/roomN.json` 스토리 작성
4. 게임에서 Room N 플레이 테스트
