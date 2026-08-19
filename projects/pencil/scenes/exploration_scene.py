"""
exploration_scene.py — 맵 JSON 기반 탐험 씬 (메인 게임플레이)
"""

import pygame

from engine.scene import Scene
from engine.map_loader import load_map
from engine.map_events import EventDispatcher
from engine.tilemap_renderer import TilemapRenderer
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, TILE_SIZE, THEMES


class ExplorationScene(Scene):
    def __init__(self, game, dev_mode=False, room_id=None):
        super().__init__(game)
        self.dev_mode = dev_mode
        self.room_id = room_id if room_id is not None else game.state.current_room
        self.map_data = None
        self.bg_surface = None
        self.dispatcher = EventDispatcher(self)
        self.renderer = TilemapRenderer()

        self.grid_x = 0
        self.grid_y = 0
        self.facing_x = 1
        self.facing_y = 0
        self.logic_x = 0.0
        self.logic_y = 0.0
        self.is_moving = False
        self.move_speed = 6.0
        self.move_t = 0.0
        self.start_grid_x = 0
        self.start_grid_y = 0
        self.logs = []
        self._room_advancing = False

        self._load_map()

    def _load_map(self):
        self.room_id = self.room_id if self.dev_mode else self.game.state.current_room
        self.map_data = load_map(self.room_id)
        self.game.camera.set_world_size(
            self.map_data.grid_w * TILE_SIZE,
            self.map_data.grid_h * TILE_SIZE,
        )

        sx, sy = self.map_data.spawn
        self.grid_x = sx
        self.grid_y = sy
        self.logic_x = float(sx)
        self.logic_y = float(sy)
        self.is_moving = False

        theme_name = THEMES.get(self.map_data.theme, THEMES["DESK_WOOD"])["name"]
        self.log_message(f"Room {self.room_id} ({theme_name}) 로드됨")

    def log_message(self, msg):
        self.logs.append(msg)
        if len(self.logs) > 6:
            self.logs.pop(0)

    def teleport_player(self, tx, ty):
        if 0 <= tx < self.map_data.grid_w and 0 <= ty < self.map_data.grid_h:
            self.grid_x = tx
            self.grid_y = ty
            self.logic_x = float(tx)
            self.logic_y = float(ty)
            self.is_moving = False
            self.log_message(f"({tx}, {ty})로 이동했습니다.")
            self._check_stepping_trigger()
        else:
            self.log_message("텔레포트 목표가 맵 밖입니다.")

    def start_dialogue(self, story_id):
        from scenes.story_scene import StoryScene
        self.game.scene_manager.push(StoryScene(self.game, story_id=story_id, pop_on_end=True))

    def advance_room(self, target="story"):
        if self._room_advancing:
            return
        self._room_advancing = True
        self.game.state.next_room()
        self.log_message(f"다음 방으로 이동합니다. (Room {self.game.state.current_room})")

        if target == "explore":
            self.room_id = self.game.state.current_room
            self._load_map()
            self._room_advancing = False
            return

        from scenes.story_scene import StoryScene
        self.game.scene_manager.change(StoryScene(self.game))

    def on_enter(self):
        self.title_font = self.game.assets.load_font(None, 32)
        self.ui_font = self.game.assets.load_font(None, 22)
        self.log_font = self.game.assets.load_font(None, 18)
        self.bg_surface = TilemapRenderer.load_bg_surface(self.game.assets, self.map_data)

    def handle_input(self, input_mgr):
        if self._room_advancing:
            return

        if input_mgr.key_pressed(pygame.K_ESCAPE):
            if self.dev_mode:
                from scenes.title_scene import TitleScene
                self.game.scene_manager.change(TitleScene(self.game))
            return

        if input_mgr.key_pressed(pygame.K_r) and self.dev_mode:
            self._load_map()
            self.on_enter()
            return

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
                if self.map_data.is_wall(nx, ny):
                    self.log_message("앞이 막혀 있습니다.")
                else:
                    self.start_grid_x = self.grid_x
                    self.start_grid_y = self.grid_y
                    self.grid_x = nx
                    self.grid_y = ny
                    self.is_moving = True
                    self.move_t = 0.0

        if input_mgr.key_pressed(pygame.K_SPACE) and not self.is_moving:
            bx, by = self.grid_x + self.facing_x, self.grid_y + self.facing_y
            cell = self.map_data.cell_at(bx, by)
            if cell and cell.type == 3:
                self._trigger_cell(cell, "interact")
            else:
                self.log_message("상호작용할 대상이 없습니다.")

    def _check_stepping_trigger(self):
        cell = self.map_data.cell_at(self.grid_x, self.grid_y)
        if cell and cell.type == 4:
            self._trigger_cell(cell, "step")

    def _trigger_cell(self, cell, expected_trigger):
        if not cell.event:
            self.log_message("이벤트가 설정되지 않았습니다.")
            return
        if cell.event.trigger != expected_trigger:
            return
        self.dispatcher.dispatch(cell.event)

    def update(self, dt):
        self.renderer.update(dt)

        if self.is_moving:
            self.move_t += dt * self.move_speed
            if self.move_t >= 1.0:
                self.logic_x = float(self.grid_x)
                self.logic_y = float(self.grid_y)
                self.is_moving = False
                self._check_stepping_trigger()
            else:
                self.logic_x = self.start_grid_x + (self.grid_x - self.start_grid_x) * self.move_t
                self.logic_y = self.start_grid_y + (self.grid_y - self.start_grid_y) * self.move_t

        px = self.logic_x * TILE_SIZE + TILE_SIZE // 2
        py = self.logic_y * TILE_SIZE + TILE_SIZE // 2
        self.game.camera._target = type(
            "O", (object,), {"rect": pygame.Rect(px, py, 1, 1)}
        )()

    def draw(self, screen):
        self.renderer.draw_background(screen, self.game.camera, self.map_data, self.bg_surface)
        self.renderer.draw_tiles(screen, self.game.camera, self.map_data, self.bg_surface)
        self.renderer.draw_player(
            screen, self.game.camera, self.logic_x, self.logic_y, self.facing_x, self.facing_y
        )

        self._draw_hud(screen)

    def _draw_hud(self, screen):
        header = pygame.Rect(0, 0, WINDOW_WIDTH, 56)
        surf = pygame.Surface((header.w, header.h), pygame.SRCALPHA)
        pygame.draw.rect(surf, (0, 0, 0, 120), (0, 0, header.w, header.h))
        screen.blit(surf, (0, 0))

        theme = THEMES.get(self.map_data.theme, THEMES["DESK_WOOD"])
        title = f"Room {self.room_id} — {theme['name']}"
        if self.dev_mode:
            title += " [DEV]"
        title_surf = self.title_font.render(title, True, Colors.CYAN)
        screen.blit(title_surf, (16, 12))

        hint = "WASD 이동 | SPACE 상호작용"
        if self.dev_mode:
            hint += " | R 리로드 | ESC 메뉴"
        hint_surf = self.ui_font.render(hint, True, Colors.LIGHT_GRAY)
        screen.blit(hint_surf, (WINDOW_WIDTH - hint_surf.get_width() - 16, 18))

        log_panel = pygame.Rect(50, WINDOW_HEIGHT - 150, WINDOW_WIDTH - 100, 100)
        log_surf = pygame.Surface((log_panel.w, log_panel.h), pygame.SRCALPHA)
        pygame.draw.rect(log_surf, (0, 0, 0, 180), (0, 0, log_panel.w, log_panel.h), border_radius=8)
        screen.blit(log_surf, log_panel.topleft)

        for i, log in enumerate(self.logs):
            color = (240, 240, 250) if i == len(self.logs) - 1 else (170, 170, 180)
            txt = self.log_font.render(log, True, color)
            screen.blit(txt, (log_panel.x + 16, log_panel.y + 10 + i * 16))
