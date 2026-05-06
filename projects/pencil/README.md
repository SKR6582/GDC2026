# Pencil Engine: Room Adventure Framework

방(Room) 기반 진행형 게임 제작을 위한 프레임워크입니다.

## 🕹 게임 구조
- **방 시스템**: 1번 방부터 N번 방까지 순차적으로 진행됩니다.
- **테마 시스템**: 특정 방 번호 구간마다 배경색, 이름, 강조 색상이 자동으로 변경됩니다. (`settings.py`에서 설정)
- **이벤트 시스템**: `GameManager`에서 설정한 특정 방 도달 시 스토리나 미니게임 씬으로 자동 전환됩니다.

## 🛠 주요 수정 방법

### 1. 테마 추가/변경 (`settings.py`)
`THEMES` 딕셔너리에 새 테마를 추가하고, `get_theme_by_room` 함수에서 구간을 설정하세요.
```python
THEMES = { "NEW_AREA": {"bg": (R,G,B), "name": "새 지역", "accent": (R,G,B)} }
```

### 2. 이벤트 방 설정 (`engine/game_manager.py`)
특정 방에서 무엇이 일어날지 `is_event_room` 함수에서 정의합니다.
```python
def is_event_room(self):
    if self.current_room == 7: return "minigame" # 7번 방은 미니게임
    return "battle"
```

### 3. 데이터 공유
모든 씬에서 `self.game.state`를 통해 현재 방 번호, 플레이어 HP 등에 접근할 수 있습니다.

## 🚀 실행
`python main.py`
