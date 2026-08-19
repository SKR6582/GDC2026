# Pencil Engine: Room Adventure Framework

방(Room) 기반 탐험형 게임 제작 프레임워크입니다.

## 게임 구조

- **방 시스템**: 1번 방부터 순차 진행 (`GameManager.current_room`)
- **플로우**: 타이틀 → 스토리 → 탐험 → (이벤트) → 다음 방 스토리 → …
- **테마**: 맵 JSON `theme` 필드 또는 `settings.py`의 방 구간별 테마

## 실행

```bash
pip install -r requirements.txt
python main.py
```

## 맵 제작 파이프라인

```text
grid_aligner (배경+그리드 정렬)
    ↓ 클립보드 JSON
map_editor (타일·이벤트 편집)
    ↓ room_N.json
ExplorationScene (게임 런타임)
```

### 1. grid_aligner

브라우저에서 `grid_aligner/index.html`을 열고 배경 이미지 위 그리드를 맞춥니다.  
**맵 에디터용 복사** 버튼으로 `{ grid_w, grid_h, bg_image }` JSON을 복사합니다.

### 2. map_editor

```bash
cd map_editor
npm install
npm start
```

- `assets/data/maps/room_N.json` 저장
- 이벤트: log, teleport, dialogue, next_room, set_flag
- **grid_aligner 설정 가져오기**로 크기·배경 자동 적용

### 3. 방 매니페스트

[`assets/data/rooms.json`](assets/data/rooms.json)에서 방 번호와 맵·스토리 파일을 연결합니다.

```json
{ "id": 1, "map": "room_1.json", "entry_story": "room1.json" }
```

## 맵 JSON 포맷 (v1)

스키마: [`assets/data/schema/map.schema.json`](assets/data/schema/map.schema.json)

| type | 이름 | 동작 |
|------|------|------|
| 0 | 길 | 통과 |
| 1 | 벽 | 충돌 |
| 2 | 장식 | 통과 |
| 3 | 상호작용 | SPACE + interact 이벤트 |
| 4 | 발판 | 밟으면 step 이벤트 |

| action | 설명 |
|--------|------|
| `log` | 화면 로그 메시지 |
| `teleport` | 맵 내 이동 `{x, y}` |
| `dialogue` | 스토리 재생 `{story_id}` |
| `next_room` | 다음 방 `{target: "story"}` |
| `set_flag` | 진행 플래그 `{key, value}` |

## 데이터 공유

모든 씬에서 `self.game.state`로 방 번호, HP, 플래그에 접근합니다.

```python
self.game.state.current_room
self.game.state.set_flag("got_key", True)
```
