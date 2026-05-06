# Pencil Engine: Zombie High Style Development Guide

본 가이드는 좀비고 스타일의 타일 기반 액션 게임 개발을 위한 종합 지침서입니다.

## 1. 프로젝트 구조 (Project Structure)
- `main.py`: 게임 실행 진입점.
- `settings.py`: 화면 크기, 타일 크기(`TILE_SIZE`), 테마 설정을 관리합니다.
- `engine/`: 게임의 핵심 엔진 모음입니다.
  - `game_manager.py`: 현재 방 번호, 이벤트 발생 로직 등을 관리합니다.
- `scenes/`: 각 게임 화면(타이틀, 스토리, 전투, 미니게임 등)을 구현하는 공간입니다.
- `assets/`: 이미지, 사운드, 폰트 리소스를 관리합니다.

## 2. 씬(Scene) 개발 방법
모든 씬은 `engine.scene.Scene`을 상속받아 구현하며, 다음 라이프사이클을 가집니다.

- `on_enter(self)`: 씬 진입 시 초기화 (이미지/폰트 로드).
- `handle_input(self, input_mgr)`: 사용자 입력 처리.
- `update(self, dt)`: 게임 로직 업데이트.
- `draw(self, screen)`: 화면 그리기.

## 3. 좀비고 스타일 조작 시스템 (Controls)
본 엔진은 타일 기반의 그리드 이동 방식을 사용합니다.

### 이동 (Movement)
- **방식**: `WASD` 또는 `방향키`. 한 칸 단위로 딱딱 맞춰 부드럽게 이동합니다.
- **연속 이동**: 키를 꾹 누르고 있으면 정지 없이 다음 칸으로 계속 이동합니다.

### 액션 맵핑 (Action Mapping)
- **액션 P**: `마우스 좌클릭` 또는 `P` 키. (동일한 기능)
- **액션 L**: `마우스 우클릭` 또는 `L` 키. (동일한 기능)
- **점프**: 더 이상 지원하지 않습니다.

## 4. 이벤트 및 씬 전환 (Flow)
- **방 이동**: `BattleScene`에서 오른쪽 끝 타일에 도달하면 다음 방으로 넘어갑니다.
- **이벤트 발생**: `GameManager.is_event_room()`에서 지정한 방 번호에 도달하면 `StoryScene`이나 `MinigameScene`으로 자동 전환됩니다.
- **씬 전환 코드**:
  ```python
  # 다음 씬으로 교체
  self.game.scene_manager.change(NextScene(self.game))
  # 일시정지 등 위에 덮어쓰기
  self.game.scene_manager.push(PauseScene(self.game))
  ```

## 5. 테마 및 상태 관리
- **테마**: `settings.py`에서 방 구간별 테마(배경색 등)를 수정할 수 있습니다.
- **상태**: `self.game.state`를 통해 현재 방 번호(`current_room`)와 점수 등에 접근 가능합니다.
