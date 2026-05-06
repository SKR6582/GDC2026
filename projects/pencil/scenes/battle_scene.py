"""
battle_scene.py — 지능형 AI, 새로운 적, 그리고 공격 시스템 구현
"""

import pygame
import random
import math
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, TILE_SIZE

class Player:
    def __init__(self, grid_x, grid_y):
        self.grid_x, self.grid_y = grid_x, grid_y
        self.logic_pos = pygame.math.Vector2(grid_x * TILE_SIZE, grid_y * TILE_SIZE)
        self.target_logic_pos = pygame.math.Vector2(self.logic_pos)
        self.is_moving = False
        self.move_speed = 380
        self.input_stack = []
        self.facing_vec = pygame.math.Vector2(1, 0) # 바라보는 방향
        
        self.max_hp = 100
        self.hp = 100
        self.invincible_timer = 0
        self.rect = pygame.Rect(0, 0, 36, 54)
        
        # 공격 관련
        self.attack_timer = 0
        self.is_attacking = False

    def handle_input(self, input_mgr, walls):
        # 이동 입력
        keys = {pygame.K_a: (-1, 0), pygame.K_d: (1, 0), pygame.K_w: (0, -1), pygame.K_s: (0, 1)}
        for k in keys:
            if input_mgr.key_pressed(k): self.input_stack.append(k)
            if input_mgr.key_released(k):
                if k in self.input_stack: self.input_stack.remove(k)

        if not self.is_moving and self.input_stack:
            last_key = self.input_stack[-1]
            move_vec = pygame.math.Vector2(keys[last_key])
            self.facing_vec = move_vec # 이동 방향으로 머리 돌림
            
            nx, ny = self.grid_x + int(move_vec.x), self.grid_y + int(move_vec.y)
            if (nx, ny) not in walls:
                self.grid_x, self.grid_y = nx, ny
                self.target_logic_pos = pygame.math.Vector2(nx * TILE_SIZE, ny * TILE_SIZE)
                self.is_moving = True

        # 공격 입력 (좌클릭/P)
        if (input_mgr.mouse_button_pressed(0) or input_mgr.key_pressed(pygame.K_p)) and not self.is_attacking:
            self.is_attacking = True
            self.attack_timer = 0.2 # 공격 판정 시간

    def update(self, dt, input_mgr, walls):
        if self.invincible_timer > 0: self.invincible_timer -= dt
        if self.attack_timer > 0:
            self.attack_timer -= dt
        else:
            self.is_attacking = False

        if self.is_moving:
            move_dir = (self.target_logic_pos - self.logic_pos)
            dist = move_dir.length()
            if dist > 0:
                amount = self.move_speed * dt
                if amount >= dist:
                    self.logic_pos = pygame.math.Vector2(self.target_logic_pos)
                    self.is_moving = False
                    if self.input_stack: # 연속 이동
                        last_key = self.input_stack[-1]
                        move_vec = pygame.math.Vector2((-1,0) if last_key==pygame.K_a else (1,0) if last_key==pygame.K_d else (0,-1) if last_key==pygame.K_w else (0,1))
                        self._start_move_if_possible(move_vec, walls)
                else:
                    self.logic_pos += move_dir.normalize() * amount
        
        px, py = self.logic_pos.x + TILE_SIZE // 2, self.logic_pos.y + TILE_SIZE // 2
        self.rect.centerx, self.rect.bottom = px, py + 10

    def _start_move_if_possible(self, move_vec, walls):
        nx, ny = self.grid_x + int(move_vec.x), self.grid_y + int(move_vec.y)
        if (nx, ny) not in walls:
            self.grid_x, self.grid_y = nx, ny
            self.target_logic_pos = pygame.math.Vector2(nx * TILE_SIZE, ny * TILE_SIZE)
            self.is_moving = True

    def draw(self, screen, camera):
        if self.invincible_timer > 0 and int(pygame.time.get_ticks() / 100) % 2 == 0: return
        draw_rect = camera.apply(self.rect)
        pygame.draw.rect(screen, Colors.CYAN, draw_rect, border_radius=8)
        pygame.draw.rect(screen, Colors.WHITE, draw_rect, 2, border_radius=8)
        
        # 공격 모션
        if self.is_attacking:
            slash_rect = pygame.Rect(0, 0, TILE_SIZE, TILE_SIZE)
            slash_rect.center = (self.rect.centerx + self.facing_vec.x * TILE_SIZE, 
                                 self.rect.centery + self.facing_vec.y * TILE_SIZE)
            pygame.draw.circle(screen, (255, 255, 255, 150), camera.apply_pos(slash_rect.center), 25, 3)

class Enemy:
    def __init__(self, grid_x, grid_y, enemy_type="normal"):
        self.grid_x, self.grid_y = grid_x, grid_y
        self.logic_pos = pygame.math.Vector2(grid_x * TILE_SIZE, grid_y * TILE_SIZE)
        self.target_logic_pos = pygame.math.Vector2(self.logic_pos)
        self.is_moving = False
        self.type = enemy_type
        
        self.move_speed = 180 if enemy_type == "normal" else 320 # 스피드몹은 훨씬 빠름
        self.move_delay = 0.5 if enemy_type == "normal" else 0.3
        self.move_timer = 0
        self.hp = 1 if enemy_type == "speed" else 2
        self.rect = pygame.Rect(0, 0, 36, 54)

    def update(self, dt, player_grid, walls):
        if not self.is_moving:
            self.move_timer += dt
            if self.move_timer >= self.move_delay:
                self.move_timer = 0
                self._ai_logic(player_grid, walls)

        if self.is_moving:
            move_dir = (self.target_logic_pos - self.logic_pos)
            dist = move_dir.length()
            if dist > 0:
                amount = self.move_speed * dt
                if amount >= dist:
                    self.logic_pos = pygame.math.Vector2(self.target_logic_pos)
                    self.is_moving = False
                else:
                    self.logic_pos += move_dir.normalize() * amount
        self.rect.centerx, self.rect.bottom = self.logic_pos.x + TILE_SIZE // 2, self.logic_pos.y + TILE_SIZE // 2 + 10

    def _ai_logic(self, p_grid, walls):
        # 개선된 AI: 장애물 우회 시도
        dx = 1 if p_grid[0] > self.grid_x else -1 if p_grid[0] < self.grid_x else 0
        dy = 1 if p_grid[1] > self.grid_y else -1 if p_grid[1] < self.grid_y else 0
        
        # 주 이동 방향 시도
        if dx != 0 and (self.grid_x + dx, self.grid_y) not in walls:
            self._start_move(dx, 0)
        elif dy != 0 and (self.grid_x, self.grid_y + dy) not in walls:
            self._start_move(0, dy)
        else: # 막혔을 때 무작위 우회 시도
            for rx, ry in [(0,1), (0,-1), (1,0), (-1,0)]:
                if (self.grid_x + rx, self.grid_y + ry) not in walls:
                    self._start_move(rx, ry)
                    break

    def _start_move(self, dx, dy):
        self.grid_x += dx
        self.grid_y += dy
        self.target_logic_pos = pygame.math.Vector2(self.grid_x * TILE_SIZE, self.grid_y * TILE_SIZE)
        self.is_moving = True

    def draw(self, screen, camera):
        color = Colors.RED if self.type == "normal" else (255, 100, 50)
        draw_rect = camera.apply(self.rect)
        pygame.draw.rect(screen, color, draw_rect, border_radius=8)
        if self.type == "speed": # 스피드몹은 눈이 더 날카로움
            pygame.draw.line(screen, Colors.WHITE, (draw_rect.x+5, draw_rect.y+15), (draw_rect.x+15, draw_rect.y+10), 2)
            pygame.draw.line(screen, Colors.WHITE, (draw_rect.x+20, draw_rect.y+10), (draw_rect.x+30, draw_rect.y+15), 2)

class BattleScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.grid_width, self.grid_height = 80, 20
        self.theme = self.game.state.get_current_theme()
        self.player = Player(5, 5)
        self.walls = set()
        self.enemies = []
        self._generate_map()
        self.font = self.game.assets.load_font(None, 24)
        self.game.camera.set_world_size(self.grid_width * TILE_SIZE, self.grid_height * TILE_SIZE)

    def _generate_map(self):
        self.walls.clear(); self.enemies = []
        for i in range(self.grid_width): self.walls.add((i, -1)); self.walls.add((i, self.grid_height))
        for _ in range(160): self.walls.add((random.randint(10, self.grid_width-5), random.randint(2, self.grid_height-2)))
        for _ in range(45):
            ex, ey = random.randint(15, self.grid_width-5), random.randint(2, self.grid_height-2)
            if (ex, ey) not in self.walls:
                etype = "speed" if random.random() > 0.7 else "normal"
                self.enemies.append(Enemy(ex, ey, etype))

    def handle_input(self, input_mgr):
        self.player.handle_input(input_mgr, self.walls)

    def update(self, dt):
        self.player.update(dt, self.game.input, self.walls)
        p_grid = (self.player.grid_x, self.player.grid_y)
        
        # 공격 판정
        if self.player.is_attacking:
            attack_rect = pygame.Rect(0, 0, TILE_SIZE*1.5, TILE_SIZE*1.5)
            attack_rect.center = (self.player.logic_pos.x + TILE_SIZE//2 + self.player.facing_vec.x * TILE_SIZE,
                                  self.player.logic_pos.y + TILE_SIZE//2 + self.player.facing_vec.y * TILE_SIZE)
            for e in self.enemies[:]:
                if attack_rect.colliderect(e.rect):
                    e.hp -= 1
                    if e.hp <= 0: self.enemies.remove(e)

        for e in self.enemies:
            e.update(dt, p_grid, self.walls)
            if self.player.rect.colliderect(e.rect) and self.player.invincible_timer <= 0:
                self.player.hp -= 20
                self.player.invincible_timer = 1.0
        
        if self.player.hp <= 0: self._respawn()
        
        # 카메라
        px, py = self.player.logic_pos.x + TILE_SIZE // 2, self.player.logic_pos.y + TILE_SIZE // 2
        self.game.camera._target = type('Obj', (object,), {'rect': pygame.Rect(px, py, 1, 1)})()
        if self.player.grid_x >= self.grid_width - 2: self._next_world()

    def _respawn(self):
        self.player.grid_x, self.player.grid_y = 5, 5
        self.player.logic_pos = pygame.math.Vector2(5*TILE_SIZE, 5*TILE_SIZE)
        self.player.target_logic_pos = pygame.math.Vector2(self.player.logic_pos)
        self.player.hp = 100; self.player.is_moving = False

    def draw(self, screen):
        screen.fill(self.theme["bg"])
        # 월드 및 그리드 렌더링 (Y-Sorting 생략)
        cam_x, cam_y = self.game.camera.offset.x, self.game.camera.offset.y
        for gy in range(max(0, int(cam_y//TILE_SIZE)-1), min(self.grid_height, int((cam_y+WINDOW_HEIGHT)//TILE_SIZE)+2)):
            for gx in range(max(0, int(cam_x//TILE_SIZE)-1), min(self.grid_width, int((cam_x+WINDOW_WIDTH)//TILE_SIZE)+2)):
                r = pygame.Rect(gx*TILE_SIZE, gy*TILE_SIZE, TILE_SIZE, TILE_SIZE)
                if (gx, gy) in self.walls:
                    b = self.game.camera.apply(r)
                    pygame.draw.rect(screen, (self.theme["accent"][0]//2, self.theme["accent"][1]//2, self.theme["accent"][2]//2), (b.x, b.y-24, b.w, b.h+24), border_radius=4)
                    pygame.draw.rect(screen, self.theme["accent"], (b.x, b.y-24, b.w, 24), border_radius=4)
                else: pygame.draw.rect(screen, (35, 40, 35), self.game.camera.apply(r), 1)

        for e in self.enemies: e.draw(screen, self.game.camera)
        self.player.draw(screen, self.game.camera)
        
        # HP Bar
        pygame.draw.rect(screen, (50, 50, 50), (20, 20, 200, 20), border_radius=10)
        pygame.draw.rect(screen, (100, 255, 100), (25, 25, 190 * (self.player.hp/100), 10), border_radius=5)
        screen.blit(self.font.render(f"ROOM {self.game.state.current_room} | HP {int(self.player.hp)} | P: ATTACK", True, Colors.WHITE), (20, 50))

    def _next_world(self):
        from scenes.story_scene import StoryScene
        self.game.scene_manager.change(StoryScene(self.game))
