# Pencil Engine Development Guide

본 프로젝트는 Pygame 기반의 모듈화된 프레임워크입니다. 동료 개발자들은 아래 가이드를 참고하여 개발해 주세요.

## 1. 프로젝트 구조 (Project Structure)
- `main.py`: 게임 실행 진입점.
- `settings.py`: 화면 크기, FPS, 공통 색상, 레이어 순서 등 상수 관리.
- `engine/`: 게임 엔진 코어 (수정 지양).
  - `game.py`: 메인 루프 및 시스템 통합.
  - `scene.py`: 씬 관리 시스템 (Change/Push/Pop).
  - `input_manager.py`: 고급 입력 처리 (Pressed vs Held).
  - `asset_loader.py`: 리소스 캐싱 및 로딩.
- `scenes/`: 실제 게임 로직 및 연출 구현 (주요 작업 공간).
- `assets/`: 리소스 파일 공간 (images, sounds, fonts).

## 2. 씬(Scene) 개발 방법
모든 씬은 `engine.scene.Scene`을 상속받아 구현합니다.

```python
class MyScene(Scene):
    def on_enter(self):
        # 씬 진입 시 초기화 (이미지 로드 등)
        self.image = self.game.assets.load_image("character.png")

    def handle_input(self, input_mgr):
        # 입력 처리
        if input_mgr.key_pressed(pygame.K_SPACE):
            # 점프 등 1회성 동작
            pass
        if input_mgr.key_held(pygame.K_RIGHT):
            # 이동 등 지속 동작
            pass

    def update(self, dt):
        # 로직 갱신 (dt: Delta Time 활용)
        pass

    def draw(self, screen):
        # 화면 출력
        screen.fill(Colors.DARK_BG)
        screen.blit(self.image, (100, 100))
```

## 3. 핵심 시스템 활용

### 입력 (Input)
`input_mgr`을 통해 키 상태를 확인합니다.
- `key_pressed(key)`: 이번 프레임에 눌렸는가? (메뉴 선택, 점프)
- `key_held(key)`: 현재 눌려 있는 상태인가? (연속 이동)
- `mouse_pos`: 현재 마우스 좌표.

### 자원 (Assets)
`self.game.assets`를 통해 로드하면 자동으로 캐싱됩니다.
- `load_image("path.png")`: 이미지 로드.
- `load_font("path.ttf", size)`: 폰트 로드 (None은 기본 폰트).
- `load_sound("path.wav")`: 효과음 로드.

### 씬 전환 (Scene Management)
- `self.game.scene_manager.change(NewScene(self.game))`: 현재 씬을 교체.
- `self.game.scene_manager.push(OverlayScene(self.game))`: 현재 씬 위에 쌓음 (일시정지).
- `self.game.scene_manager.pop()`: 이전 씬으로 복귀.

## 4. 작업 가이드
1. 새로운 씬이 필요하면 `scenes/` 폴더에 새 파일을 만듭니다.
2. `scenes/__init__.py`에 해당 클래스를 import 해줍니다.
3. `settings.py`에 필요한 상수나 색상을 추가합니다.
4. 모든 이동 및 애니메이션은 `update(dt)`의 `dt` 값을 곱하여 구현합니다.
