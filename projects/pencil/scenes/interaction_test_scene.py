"""
interaction_test_scene.py — 오브젝트 상호작용 테스트 맵 씬 (카메라 스크롤링, 대형 맵 및 커스텀 배경 이미지 지원).
이동, 벽 충돌, 맵 파일 로드, 실시간 람다 함수 실행, 로그 콘솔 UI, 카메라 추적 지원.
"""

import pygame
import json
import os
import math
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, TILE_SIZE, ASSETS_DIR


class InteractionTestScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.map_path = os.path.join(ASSETS_DIR, "data", "test_map.json")
        self.map_data = []
        self.grid_w = 0
        self.grid_h = 0
        self.bg_image_name = "None"
        self.bg_image = None

        # 플레이어 상태
        self.grid_x = 0
        self.grid_y = 0
        self.facing_x = 1
        self.facing_y = 0

        # 보간된 이동용
        self.logic_x = 0.0
        self.logic_y = 0.0
        self.is_moving = False
        self.move_speed = 6.0  # 타일당 이동 속도
        self.move_t = 0.0
        self.start_grid_x = 0
        self.start_grid_y = 0

        # 로그 시스템
        self.logs = ["상호작용 테스트 씬이 로드되었습니다."]
        
        # 애니메이션용 타이머
        self.elapsed = 0.0

        self._load_or_create_map()

    def _load_or_create_map(self):
        """맵 데이터를 JSON에서 로드하고 카메라 범위와 플레이어 위치를 초기화합니다."""
        os.makedirs(os.path.dirname(self.map_path), exist_ok=True)
        if os.path.exists(self.map_path):
            try:
                with open(self.map_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # 오브젝트 래핑 포맷 또는 이전 원시 2D 배열 포맷 호환 로드
                if isinstance(data, dict) and "grid" in data:
                    self.map_data = data["grid"]
                    self.bg_image_name = data.get("bg_image", "None")
                else:
                    self.map_data = data
                    self.bg_image_name = "None"
                
                self.log_message("맵 데이터를 불러왔습니다.")
            except Exception as e:
                self.log_message(f"맵 로드 실패, 기본 맵 생성: {e}")
                self._create_default_map()
        else:
            self._create_default_map()

        self.grid_h = len(self.map_data)
        self.grid_w = len(self.map_data[0]) if self.grid_h > 0 else 0

        # 카메라 크기를 맵 크기에 맞게 조절
        self.game.camera.set_world_size(self.grid_w * TILE_SIZE, self.grid_h * TILE_SIZE)

        # 플레이어 시작 위치 검색 (가장 처음 나오는 타입 0: 길 타일)
        found = False
        for y in range(self.grid_h):
            for x in range(self.grid_w):
                cell_type = self.map_data[y][x].get("type", 0)
                if cell_type == 0:  # 길
                    self.grid_x = x
                    self.grid_y = y
                    self.logic_x = float(x)
                    self.logic_y = float(y)
                    found = True
                    break
            if found:
                break

    def _create_default_map(self):
        """기본 60x20 맵 생성 및 저장"""
        grid = []
        for y in range(20):
            row = []
            for x in range(60):
                # 벽 테두리
                if x == 0 or x == 59 or y == 0 or y == 19:
                    row.append({"type": 1, "lambda": "None"})
                else:
                    row.append({"type": 0, "lambda": "None"})
            grid.append(row)

        # 테스트용 상호작용 오브젝트 몇 개 배치
        grid[5][10] = {"type": 3, "lambda": "lambda scene: scene.log_message('보물 상자를 열었습니다!')"}
        grid[10][20] = {"type": 3, "lambda": "lambda scene: scene.log_message('기록 일지를 발견했습니다. 람다가 정상 실행됩니다.')"}
        grid[8][30] = {"type": 4, "lambda": "lambda scene: scene.log_message('차원 관문 진입! (5, 5)로 텔레포트!') or scene.teleport_player(5, 5)"}

        self.map_data = grid
        self.bg_image_name = "None"

        payload = {
            "bg_image": self.bg_image_name,
            "grid": self.map_data
        }

        try:
            with open(self.map_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=4)
            self.log_message("기본 60x20 크기의 맵 파일을 생성했습니다.")
        except Exception as e:
            self.log_message(f"기본 맵 파일 작성 중 오류: {e}")

    def log_message(self, msg):
        """콘솔 로그에 새 줄을 추가합니다."""
        self.logs.append(msg)
        if len(self.logs) > 6:
            self.logs.pop(0)

    def teleport_player(self, tx, ty):
        """플레이어를 특정 타일 좌표로 순간이동시킵니다."""
        if 0 <= tx < self.grid_w and 0 <= ty < self.grid_h:
            self.grid_x = tx
            self.grid_y = ty
            self.logic_x = float(tx)
            self.logic_y = float(ty)
            self.is_moving = False
            self.log_message(f"플레이어가 ({tx}, {ty})로 텔레포트했습니다.")
            self._check_stepping_trigger()
        else:
            self.log_message("순간이동 오류: 대상 좌표가 맵 바깥입니다.")

    def on_enter(self):
        self.title_font = self.game.assets.load_font(None, 36)
        self.ui_font = self.game.assets.load_font(None, 24)
        self.log_font = self.game.assets.load_font(None, 20)

        # 커스텀 배경 이미지 로드 및 격자 월드 크기에 맞춰 스케일링
        if self.bg_image_name and self.bg_image_name != "None":
            try:
                raw_img = self.game.assets.load_image(self.bg_image_name)
                self.bg_image = pygame.transform.scale(raw_img, (self.grid_w * TILE_SIZE, self.grid_h * TILE_SIZE))
                self.log_message(f"커스텀 배경 이미지 '{self.bg_image_name}'를 성공적으로 로드했습니다.")
            except Exception as e:
                self.bg_image = None
                self.log_message(f"배경 이미지 로드 실패: {e}")
        else:
            self.bg_image = None

    def handle_input(self, input_mgr):
        if input_mgr.key_pressed(pygame.K_ESCAPE):
            from scenes.title_scene import TitleScene
            self.game.scene_manager.change(TitleScene(self.game))
            return

        if input_mgr.key_pressed(pygame.K_r):
            self._load_or_create_map()
            self.on_enter() # 이미지 로드 갱신
            return

        # 플레이어 수동 이동 처리
        if not self.is_moving:
            dx, dy = 0, 0
            if input_mgr.key_held(pygame.K_w) or input_mgr.key_held(pygame.K_UP):
                dy = -1
            elif input_mgr.key_held(pygame.K_s) or input_mgr.key_held(pygame.K_DOWN):
                dy = 1
            elif input_mgr.key_held(pygame.K_a) or input_mgr.key_held(pygame.K_LEFT):
                dx = -1
            elif input_mgr.key_held(pygame.K_d) or input_mgr.key_held(pygame.K_RIGHT):
                dx = 1

            if dx != 0 or dy != 0:
                self.facing_x = dx
                self.facing_y = dy
                nx, ny = self.grid_x + dx, self.grid_y + dy

                # 맵 영역 검사
                if 0 <= nx < self.grid_w and 0 <= ny < self.grid_h:
                    cell = self.map_data[ny][nx]
                    # 지우개 벽(type 1)은 충돌 처리
                    if cell.get("type", 0) != 1:
                        self.start_grid_x = self.grid_x
                        self.start_grid_y = self.grid_y
                        self.grid_x = nx
                        self.grid_y = ny
                        self.is_moving = True
                        self.move_t = 0.0
                    else:
                        self.log_message("앞이 벽으로 막혀있습니다.")
                else:
                    self.log_message("맵의 끝자락입니다.")

        # SPACE 키로 앞 상자 상호작용 (타입 3)
        if input_mgr.key_pressed(pygame.K_SPACE) and not self.is_moving:
            bx, by = self.grid_x + self.facing_x, self.grid_y + self.facing_y
            if 0 <= bx < self.grid_w and 0 <= by < self.grid_h:
                cell = self.map_data[by][bx]
                if cell.get("type", 0) == 3:
                    self.log_message(f"({bx}, {by}) 오브젝트 상호작용 시도...")
                    self._run_lambda(cell)
                else:
                    self.log_message("앞에 열 수 있는 상자가 없습니다.")
            else:
                self.log_message("앞에 아무것도 없습니다.")

    def _check_stepping_trigger(self):
        """현재 밟은 발판(타입 4) 트리거 체크"""
        cell = self.map_data[self.grid_y][self.grid_x]
        if cell.get("type", 0) == 4:
            self.log_message(f"({self.grid_x}, {self.grid_y}) 발판 트리거 발동...")
            self._run_lambda(cell)

    def _run_lambda(self, cell):
        lambda_str = cell.get("lambda", "None")
        if not lambda_str or lambda_str == "None":
            self.log_message("설정된 람다 동작이 없습니다.")
            return
        
        try:
            func = eval(lambda_str)
            func(self)
        except Exception as e:
            self.log_message(f"람다 해석 실행 에러: {e}")

    def update(self, dt):
        self.elapsed += dt

        # 이동 보간 계산
        if self.is_moving:
            self.move_t += dt * self.move_speed
            if self.move_t >= 1.0:
                self.logic_x = float(self.grid_x)
                self.logic_y = float(self.grid_y)
                self.is_moving = False
                self.log_message(f"({self.grid_x}, {self.grid_y}) 타일 도착.")
                self._check_stepping_trigger()
            else:
                self.logic_x = self.start_grid_x + (self.grid_x - self.start_grid_x) * self.move_t
                self.logic_y = self.start_grid_y + (self.grid_y - self.start_grid_y) * self.move_t

        # 카메라가 플레이어(logic_x, logic_y)를 스무스하게 따라가도록 설정
        px = self.logic_x * TILE_SIZE + TILE_SIZE // 2
        py = self.logic_y * TILE_SIZE + TILE_SIZE // 2
        self.game.camera._target = type('O', (object,), {'rect': pygame.Rect(px, py, 1, 1)})()

    def draw(self, screen):
        cam = self.game.camera
        cx, cy = cam.offset.x, cam.offset.y

        # 1. 배경 그리기 (커스텀 배경 이미지가 로드된 경우 해당 이미지 블릿, 아닌 경우 기본 나무색 채우기)
        if self.bg_image:
            dr = cam.apply(pygame.Rect(0, 0, self.grid_w * TILE_SIZE, self.grid_h * TILE_SIZE))
            screen.fill((30, 30, 35)) # 오버스크롤 시 보일 백그라운드 어두운색
            screen.blit(self.bg_image, (dr.x, dr.y))
        else:
            screen.fill((160, 120, 80)) # 나무결 기본 바탕색

        # 화면에 보이는 영역만 최적화하여 렌더링
        start_x = max(0, int(cx // TILE_SIZE) - 1)
        end_x = min(self.grid_w, int((cx + WINDOW_WIDTH) // TILE_SIZE) + 2)
        start_y = max(0, int(cy // TILE_SIZE) - 1)
        end_y = min(self.grid_h, int((cy + WINDOW_HEIGHT) // TILE_SIZE) + 2)

        for y in range(start_y, end_y):
            for x in range(start_x, end_x):
                cell = self.map_data[y][x]
                cell_type = cell.get("type", 0)
                tr = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                dtr = cam.apply(tr)

                # 그리드 격자 선 (커스텀 배경 이미지가 없을 때만 진하게 출력)
                if not self.bg_image:
                    pygame.draw.line(screen, (140, 105, 70), (dtr.x, dtr.bottom), (dtr.right, dtr.bottom))
                    pygame.draw.line(screen, (140, 105, 70), (dtr.right, dtr.y), (dtr.right, dtr.bottom))
                else:
                    # 배경 이미지가 있을 때는 격자 선을 아주 가볍게 반투명 오버레이 처리
                    pygame.draw.line(screen, (255, 255, 255, 30), (dtr.x, dtr.bottom), (dtr.right, dtr.bottom))
                    pygame.draw.line(screen, (255, 255, 255, 30), (dtr.right, dtr.y), (dtr.right, dtr.bottom))

                if cell_type == 1:  # 지우개 벽 (2.5D 입체 크림 지우개 블록)
                    pygame.draw.rect(screen, (220, 200, 180), (dtr.x, dtr.y-16, dtr.w, dtr.h+16), border_radius=4)
                    pygame.draw.rect(screen, (240, 220, 200), (dtr.x, dtr.y-16, dtr.w, 16), border_radius=4)
                    pygame.draw.rect(screen, (180, 160, 140), (dtr.x, dtr.y-16, dtr.w, dtr.h+16), 1, border_radius=4)
                elif cell_type == 2:  # 장식 (화초 꽃)
                    pygame.draw.circle(screen, (80, 180, 80), dtr.center, 8)
                elif cell_type == 3:  # 상자
                    box = pygame.Rect(dtr.x + 8, dtr.y + 8, TILE_SIZE - 16, TILE_SIZE - 16)
                    pulse = math.sin(self.elapsed * 6.0) * 2
                    pygame.draw.rect(screen, (255, 215, 0), box.inflate(pulse, pulse), border_radius=4)
                    pygame.draw.rect(screen, (200, 150, 0), box.inflate(pulse, pulse), 2, border_radius=4)
                    pygame.draw.circle(screen, (80, 50, 10), box.center, 3)
                elif cell_type == 4:  # 포탈
                    pulse = abs(math.sin(self.elapsed * 4.0)) * 6
                    pygame.draw.circle(screen, (140, 100, 220), dtr.center, 10 + int(pulse), 2)
                    pygame.draw.circle(screen, (100, 70, 180), dtr.center, 5)

        # 3. 플레이어 그리기 (카메라 적용 위치)
        px_world = self.logic_x * TILE_SIZE + TILE_SIZE // 2
        py_world = self.logic_y * TILE_SIZE + TILE_SIZE // 2
        px_screen, py_screen = cam.apply_pos((px_world, py_world))

        # 연필 캐릭터 본체
        pygame.draw.circle(screen, (255, 220, 80), (px_screen, py_screen), 16)
        pygame.draw.circle(screen, (180, 160, 60), (px_screen, py_screen), 16, 2)
        # 바라보는 방향 연필심 심볼
        tip_x = px_screen + self.facing_x * 12
        tip_y = py_screen + self.facing_y * 12
        pygame.draw.circle(screen, (230, 50, 50), (int(tip_x), int(tip_y)), 4)

        # 4. 상단 헤더 UI
        header_rect = pygame.Rect(0, 0, WINDOW_WIDTH, 65)
        # 헤더 반투명 띠
        s_head = pygame.Surface((header_rect.w, header_rect.h), pygame.SRCALPHA)
        pygame.draw.rect(s_head, (0, 0, 0, 120), (0, 0, header_rect.w, header_rect.h))
        screen.blit(s_head, (0, 0))
        
        title_surf = self.title_font.render("오브젝트 상호작용 테스트 (60x20 카메라 뷰)", True, Colors.CYAN)
        screen.blit(title_surf, (20, 12))

        # 5. 콘솔 로그창 (하단 고정)
        log_panel = pygame.Rect(50, WINDOW_HEIGHT - 180, WINDOW_WIDTH - 100, 120)
        s_log = pygame.Surface((log_panel.width, log_panel.height), pygame.SRCALPHA)
        pygame.draw.rect(s_log, (0, 0, 0, 180), (0, 0, log_panel.width, log_panel.height), border_radius=10)
        screen.blit(s_log, log_panel.topleft)
        pygame.draw.rect(screen, Colors.MID_GRAY, log_panel, 2, border_radius=10)

        for i, log in enumerate(self.logs):
            txt = self.log_font.render(log, True, (240, 240, 250) if i == len(self.logs) - 1 else (170, 170, 180))
            screen.blit(txt, (log_panel.x + 20, log_panel.y + 10 + i * 18))

        # 6. 좌측 조작 가이드 오버레이 (고정 위치)
        guide_box = pygame.Rect(20, 80, 220, 240)
        s_guide = pygame.Surface((guide_box.w, guide_box.h), pygame.SRCALPHA)
        pygame.draw.rect(s_guide, (0, 0, 0, 140), (0, 0, guide_box.w, guide_box.h), border_radius=8)
        screen.blit(s_guide, guide_box.topleft)
        pygame.draw.rect(screen, Colors.MID_GRAY, guide_box, 1, border_radius=8)

        guide_lines = [
            "  [ 조작 키 가이드 ]",
            "WASD / 방향키 : 이동",
            "SPACE : 바라보는 앞 상호작용",
            "R : 맵 JSON 새로고침",
            "ESC : 메인 메뉴로",
            "",
            "  [ 오브젝트 설명 ]",
            "📦 (타입 3) : 마주보고 상호작용",
            "🌀 (타입 4) : 밟으면 상호작용"
        ]
        g_y = guide_box.y + 12
        for line in guide_lines:
            color = Colors.CYAN if line.startswith("  [") else Colors.LIGHT_GRAY
            txt = self.log_font.render(line, True, color)
            screen.blit(txt, (guide_box.x + 10, g_y))
            g_y += 24

        # 7. 우측 좌표 정보 오버레이 (고정 위치)
        info_box = pygame.Rect(WINDOW_WIDTH - 240, 80, 220, 150)
        s_info = pygame.Surface((info_box.w, info_box.h), pygame.SRCALPHA)
        pygame.draw.rect(s_info, (0, 0, 0, 140), (0, 0, info_box.w, info_box.h), border_radius=8)
        screen.blit(s_info, info_box.topleft)
        pygame.draw.rect(screen, Colors.MID_GRAY, info_box, 1, border_radius=8)

        info_lines = [
            "  [ 플레이어 정보 ]",
            f"타일 좌표: ({self.grid_x}, {self.grid_y})",
            f"바라보는 방향: ({self.facing_x}, {self.facing_y})",
            "",
            f"맵 크기: {self.grid_w} x {self.grid_h} 칸",
        ]
        i_y = info_box.y + 12
        for line in info_lines:
            color = Colors.CYAN if line.startswith("  [") else Colors.LIGHT_GRAY
            txt = self.log_font.render(line, True, color)
            screen.blit(txt, (info_box.x + 10, i_y))
            i_y += 24
