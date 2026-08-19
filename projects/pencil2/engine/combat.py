import math
import random
import pygame
from settings import TILE_SIZE, COLOR_YELLOW, COLOR_RED, COLOR_WHITE

class DamageText:
    def __init__(self, x, y, text, color=COLOR_YELLOW, is_crit=False):
        self.x = x
        self.y = y
        self.text = str(text)
        self.color = color
        self.is_crit = is_crit
        self.lifetime = 0.8 # 초
        self.timer = 0.0
        self.vy = -35.0 # 위로 떠오르는 속도
        self.vx = random.uniform(-10.0, 10.0)

    def update(self, dt):
        self.timer += dt
        self.x += self.vx * dt
        self.y += self.vy * dt

    def is_expired(self):
        return self.timer >= self.lifetime

    def draw(self, screen, camera_offset, font):
        alpha = max(0, int(255 * (1.0 - (self.timer / self.lifetime))))
        sx = int(self.x - camera_offset[0])
        sy = int(self.y - camera_offset[1])
        
        txt_surf = font.render(self.text, True, self.color)
        txt_surf.set_alpha(alpha)
        
        if self.is_crit:
            # 치명타/스킬 타격 확대
            txt_surf = pygame.transform.scale2x(txt_surf)
            
        screen.blit(txt_surf, (sx, sy))


class Hitbox:
    def __init__(self, cx, cy, radius, damage, knockback_vector=(0, 0), knockback=(0, 0), source_type="player"):
        self.cx = cx
        self.cy = cy
        self.radius = radius
        self.damage = damage
        # knockback 또는 knockback_vector 둘 다 허용
        self.knockback_vector = knockback if knockback != (0, 0) else knockback_vector
        self.source_type = source_type # 'player' or 'monster'
        self.hit_entities = set() # 한 번의 판정에서 중복 피격 방지


    def check_collision(self, target_rect):
        # 원과 직사각형의 충돌 판정
        closest_x = max(target_rect.left, min(self.cx, target_rect.right))
        closest_y = max(target_rect.top, min(self.cy, target_rect.bottom))
        dist_sq = (self.cx - closest_x) ** 2 + (self.cy - closest_y) ** 2
        return dist_sq <= (self.radius ** 2)


class CombatSystem:
    """전투 및 히트박스, 대미지 팝업 관리자"""
    def __init__(self):
        self.damage_texts = []
        self.active_hitboxes = []

    def spawn_damage_text(self, x, y, text, color=COLOR_YELLOW, is_crit=False):
        self.damage_texts.append(DamageText(x, y, text, color, is_crit))

    def update(self, dt):
        # 팝업 텍스트 갱신
        for dt_text in self.damage_texts:
            dt_text.update(dt)
        self.damage_texts = [t for t in self.damage_texts if not t.is_expired()]
        
        # 히트박스는 프레임 단위로 수명 종료
        self.active_hitboxes.clear()

    def draw_effects(self, screen, camera_offset, font):
        for dt_text in self.damage_texts:
            dt_text.draw(screen, camera_offset, font)
