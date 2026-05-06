"""
battle_scene.py — AttributeError(font) 수정 및 RPG 시점 유지
"""

import pygame
import random
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, TILE_SIZE

class Player:
    def __init__(self, grid_x, grid_y):
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.logic_pos = pygame.math.Vector2(grid_x * TILE_SIZE, grid_y * TILE_SIZE)
        self.target_logic_pos = pygame.math.Vector2(self.logic_pos)
        self.is_moving = False
        self.move_speed = 300
        self.input_stack = []
        self.key_map = {
            pygame.K_a: pygame.math.Vector2(-1, 0),
            pygame.K_d: pygame.math.Vector2(1, 0),
            pygame.K_w: pygame.math.Vector2(0, -1),
            pygame.K_s: pygame.math.Vector2(0, 1)
        }

    def handle_input(self, input_mgr, walls):
        for key in self.key_map:
            if input_mgr.key_pressed(key):
                if key not in self.input_stack: self.input_stack.append(key)
            if input_mgr.key_released(key):
                if key in self.input_stack: self.input_stack.remove(key)

        if not self.is_moving and self.input_stack:
            last_key = self.input_stack[-1]
            move_vec = self.key_map[last_key]
            self._start_move_if_possible(move_vec, walls)

    def _start_move_if_possible(self, move_vec, walls):
        nx, ny = self.grid_x + int(move_vec.x), self.grid_y + int(move_vec.y)
        if (nx, ny) not in walls:
            self.grid_x, self.grid_y = nx, ny
            self.target_logic_pos = pygame.math.Vector2(nx * TILE_SIZE, ny * TILE_SIZE)
            self.is_moving = True

    def update(self, dt, input_mgr, walls):
        if self.is_moving:
            move_dir = (self.target_logic_pos - self.logic_pos)
            distance = move_dir.length()
            if distance > 0:
                move_amount = self.move_speed * dt
                if move_amount >= distance:
                    self.logic_pos = pygame.math.Vector2(self.target_logic_pos)
                    self.is_moving = False
                    if self.input_stack:
                        self._start_move_if_possible(self.key_map[self.input_stack[-1]], walls)
                else:
                    self.logic_pos += move_dir.normalize() * move_amount

    def draw(self, screen, camera):
        px, py = self.logic_pos.x + TILE_SIZE // 2, self.logic_pos.y + TILE_SIZE // 2
        char_rect = pygame.Rect(0, 0, 34, 52)
        char_rect.centerx = px
        char_rect.bottom = py + 10
        draw_rect = camera.apply(char_rect)
        shadow_rect = pygame.Rect(0, 0, 28, 12)
        shadow_rect.center = (draw_rect.centerx, draw_rect.bottom - 5)
        pygame.draw.ellipse(screen, (0, 0, 0, 80), shadow_rect)
        pygame.draw.rect(screen, Colors.CYAN, draw_rect, border_radius=8)
        pygame.draw.rect(screen, Colors.WHITE, draw_rect, 2, border_radius=8)

class BattleScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.grid_width = 60
        self.grid_height = 40
        self.theme = self.game.state.get_current_theme()
        self.player = Player(5, 5)
        self.walls = set()
        self._generate_map()
        
        # 폰트를 미리 로드하여 AttributeError 방지
        self.font = self.game.assets.load_font(None, 24)
        self.game.camera.set_world_size(self.grid_width * TILE_SIZE, self.grid_height * TILE_SIZE)

    def _generate_map(self):
        self.walls.clear()
        for i in range(self.grid_width):
            self.walls.add((i, -1))
            self.walls.add((i, self.grid_height))
        for i in range(self.grid_height):
            self.walls.add((-1, i))
            self.walls.add((self.grid_width, i))
        for _ in range(120):
            self.walls.add((random.randint(2, self.grid_width-2), random.randint(2, self.grid_height-2)))

    def on_enter(self):
        pass # 이미 __init__에서 처리함

    def handle_input(self, input_mgr):
        self.player.handle_input(input_mgr, self.walls)

    def update(self, dt):
        self.player.update(dt, self.game.input, self.walls)
        px, py = self.player.logic_pos.x + TILE_SIZE // 2, self.player.logic_pos.y + TILE_SIZE // 2
        self.game.camera._target = type('Obj', (object,), {'rect': pygame.Rect(px, py, 1, 1)})()
        if self.player.grid_x >= self.grid_width - 2:
            self._next_world()

    def draw(self, screen):
        screen.fill(self.theme["bg"])
        # 그리드 및 입체 벽 그리기 로직 (Y-sorting 생략)
        for gy in range(int(self.game.camera.offset.y // TILE_SIZE) - 1, int((self.game.camera.offset.y + WINDOW_HEIGHT) // TILE_SIZE) + 1):
            for gx in range(int(self.game.camera.offset.x // TILE_SIZE) - 1, int((self.game.camera.offset.x + WINDOW_WIDTH) // TILE_SIZE) + 1):
                if 0 <= gx < self.grid_width and 0 <= gy < self.grid_height:
                    tile_rect = pygame.Rect(gx * TILE_SIZE, gy * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    pygame.draw.rect(screen, (35, 40, 35), self.game.camera.apply(tile_rect), 1)
                    if (gx, gy) in self.walls:
                        draw_base = self.game.camera.apply(tile_rect)
                        face_rect = pygame.Rect(draw_base.x, draw_base.y - 24, draw_base.width, draw_base.height + 24)
                        pygame.draw.rect(screen, (self.theme["accent"][0]//2, self.theme["accent"][1]//2, self.theme["accent"][2]//2), face_rect, border_radius=4)
                        top_rect = pygame.Rect(draw_base.x, draw_base.y - 24, draw_base.width, 24)
                        pygame.draw.rect(screen, self.theme["accent"], top_rect, border_radius=4)
                        pygame.draw.rect(screen, Colors.WHITE, top_rect, 1, border_radius=4)

        self.player.draw(screen, self.game.camera)
        info = f"ROOM {self.game.state.current_room} | 2.5D RPG Mode | Stable"
        if hasattr(self, 'font'): # 한 번 더 안전하게 체크
            screen.blit(self.font.render(info, True, Colors.WHITE), (20, 20))

    def _next_world(self):
        self.game.scene_manager.change(BattleScene(self.game))
