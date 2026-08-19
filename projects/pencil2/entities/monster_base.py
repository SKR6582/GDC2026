import math
import pygame
from settings import TILE_SIZE, COLOR_RED, COLOR_RED_ALPHA, COLOR_GREEN
from engine.asset_manager import AssetManager

class MonsterBase:
    def __init__(self, tx, ty, name, max_hp, move_speed=2.0):
        self.tx = tx
        self.ty = ty
        self.world_x = float(tx * TILE_SIZE)
        self.world_y = float(ty * TILE_SIZE)
        self.name = name
        self.max_hp = max_hp
        self.hp = max_hp
        self.move_speed = move_speed
        
        self.is_alive = True
        self.invulnerable_timer = 0.0
        self.knockback_vx = 0.0
        self.knockback_vy = 0.0
        
        # 텔레그래프 (공격 예고 영역)
        self.telegraph_shape = None # {'type': 'circle'|'rect'|'cone', 'args': ...}
        self.telegraph_timer = 0.0
        self.telegraph_duration = 0.0

    @property
    def center_x(self):
        return self.world_x + TILE_SIZE // 2

    @property
    def center_y(self):
        return self.world_y + TILE_SIZE // 2

    @property
    def collision_rect(self):
        return pygame.Rect(int(self.world_x + 6), int(self.world_y + 6), TILE_SIZE - 12, TILE_SIZE - 12)

    def take_damage(self, damage, knockback=(0, 0), combat_system=None):
        if not self.is_alive or self.invulnerable_timer > 0:
            return False
            
        self.hp -= damage
        self.invulnerable_timer = 0.25
        self.knockback_vx, self.knockback_vy = knockback
        
        if combat_system:
            combat_system.spawn_damage_text(self.center_x, self.world_y - 8, f"{damage}", (255, 220, 60))
            
        if self.hp <= 0:
            self.hp = 0
            self.is_alive = False
            if combat_system:
                combat_system.spawn_damage_text(self.center_x, self.world_y - 20, "처치!", (255, 100, 100), is_crit=True)
        return True

    def move_and_collide(self, dx, dy, map_data, size_tiles=1):
        """
        벽(is_wall) 충돌 검사를 동반한 축별(X, Y) 슬라이딩 이동
        """
        margin = 6
        box_w = size_tiles * TILE_SIZE - margin * 2
        box_h = size_tiles * TILE_SIZE - margin * 2

        # 1. X축 이동 & 충돌
        if dx != 0:
            target_x = self.world_x + dx
            rect_x = pygame.Rect(int(target_x + margin), int(self.world_y + margin), int(box_w), int(box_h))
            if not self._check_rect_wall_collision(rect_x, map_data):
                self.world_x = target_x
            else:
                # X축 넉백도 정지
                self.knockback_vx = 0.0

        # 2. Y축 이동 & 충돌
        if dy != 0:
            target_y = self.world_y + dy
            rect_y = pygame.Rect(int(self.world_x + margin), int(target_y + margin), int(box_w), int(box_h))
            if not self._check_rect_wall_collision(rect_y, map_data):
                self.world_y = target_y
            else:
                # Y축 넉백도 정지
                self.knockback_vy = 0.0

        # 타일 좌표 동기화
        self.tx = int((self.world_x + TILE_SIZE // 2) // TILE_SIZE)
        self.ty = int((self.world_y + TILE_SIZE // 2) // TILE_SIZE)

    def _check_rect_wall_collision(self, rect, map_data):
        min_tx = rect.left // TILE_SIZE
        max_tx = rect.right // TILE_SIZE
        min_ty = rect.top // TILE_SIZE
        max_ty = rect.bottom // TILE_SIZE

        for ty in range(min_ty, max_ty + 1):
            for tx in range(min_tx, max_tx + 1):
                if map_data.is_wall(tx, ty):
                    return True
        return False

    def update_physics(self, dt, map_data):
        # 무적 시간
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt

        # 넉백 물리 감쇠 & 충돌
        if abs(self.knockback_vx) > 1.0 or abs(self.knockback_vy) > 1.0:
            self.move_and_collide(self.knockback_vx * dt, self.knockback_vy * dt, map_data)
            self.knockback_vx *= 0.85
            self.knockback_vy *= 0.85
        else:
            self.knockback_vx = 0.0
            self.knockback_vy = 0.0


    def draw_hp_bar(self, screen, px, py):
        if self.hp >= self.max_hp:
            return # 풀피일 때 숨김
            
        bar_w = TILE_SIZE - 4
        bar_h = 4
        fill_w = int(bar_w * (self.hp / self.max_hp))
        
        pygame.draw.rect(screen, (40, 40, 40), (px + 2, py - 8, bar_w, bar_h))
        pygame.draw.rect(screen, COLOR_GREEN, (px + 2, py - 8, fill_w, bar_h))
        pygame.draw.rect(screen, (0, 0, 0), (px + 2, py - 8, bar_w, bar_h), 1)

    def draw_telegraph(self, screen, camera_offset):
        if not self.telegraph_shape or self.telegraph_duration <= 0:
            return
            
        t_type = self.telegraph_shape.get("type")
        if t_type == "rect":
            rx = self.telegraph_shape["x"] - camera_offset[0]
            ry = self.telegraph_shape["y"] - camera_offset[1]
            rw = self.telegraph_shape["w"]
            rh = self.telegraph_shape["h"]
            
            overlay = pygame.Surface((rw, rh), pygame.SRCALPHA)
            overlay.fill(COLOR_RED_ALPHA)
            pygame.draw.rect(overlay, COLOR_RED, (0, 0, rw, rh), 2)
            screen.blit(overlay, (rx, ry))
            
        elif t_type == "circle":
            cx = self.telegraph_shape["cx"] - camera_offset[0]
            cy = self.telegraph_shape["cy"] - camera_offset[1]
            r = self.telegraph_shape["radius"]
            
            overlay = pygame.Surface((r * 2, r * 2), pygame.SRCALPHA)
            pygame.draw.circle(overlay, COLOR_RED_ALPHA, (r, r), r)
            pygame.draw.circle(overlay, COLOR_RED, (r, r), r, 2)
            screen.blit(overlay, (cx - r, cy - r))
