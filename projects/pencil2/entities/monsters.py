import math
import random
import pygame
from settings import TILE_SIZE, COLOR_RED, COLOR_YELLOW
from engine.asset_manager import AssetManager
from engine.combat import Hitbox
from entities.monster_base import MonsterBase

# -------------------------------------------------------------
# 1. 낡은 연필 (PencilMonster)
# 패턴: 75도 고개 숙여 전방 휘두르기
# -------------------------------------------------------------
class PencilMonster(MonsterBase):
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "낡은 연필", max_hp=50, move_speed=1.6)
        self.state = "idle" # idle, chase, windup, attack, cooldown
        self.state_timer = random.uniform(0.5, 1.2)
        self.attack_angle = 0.0
        self.target_dir = (0, 1)

    def update(self, dt, player, map_data, combat_system):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt
        dx = player.center_x - self.center_x
        dy = player.center_y - self.center_y
        dist = math.sqrt(dx * dx + dy * dy)

        if self.state == "idle":
            if self.state_timer <= 0:
                self.state = "chase"
                self.state_timer = 2.0
        elif self.state == "chase":
            if dist < TILE_SIZE * 1.5:
                # 75도 숙이기 공격 준비 (Windup)
                self.state = "windup"
                self.state_timer = 0.5
                self.target_dir = (1 if dx > 0 else -1, 1 if dy > 0 else -1)
                # 전방 공격 예고
                self.telegraph_shape = {
                    "type": "circle",
                    "cx": self.center_x + (1 if dx > 0 else -1) * 20,
                    "cy": self.center_y + (1 if dy > 0 else -1) * 20,
                    "radius": 24
                }
                self.telegraph_duration = 0.5
            else:
                # 플레이어 추적 (벽 충돌 검사)
                if dist > 0:
                    step = self.move_speed * TILE_SIZE * dt
                    self.move_and_collide((dx / dist) * step, (dy / dist) * step, map_data)

        elif self.state == "windup":
            self.attack_angle = -30.0 + (1.0 - (self.state_timer / 0.5)) * 105.0 # 75도 스윙 모션
            if self.state_timer <= 0:
                self.state = "attack"
                self.state_timer = 0.2
                self.telegraph_shape = None
                # 타격 히트박스 생성
                hx = self.center_x + (1 if dx > 0 else -1) * 24
                hy = self.center_y + (1 if dy > 0 else -1) * 24
                combat_system.active_hitboxes.append(Hitbox(hx, hy, 26, damage=15, source_type="monster"))
        elif self.state == "attack":
            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.0
        elif self.state == "cooldown":
            self.attack_angle = 0.0
            if self.state_timer <= 0:
                self.state = "idle"
                self.state_timer = 0.8

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        surf = AssetManager.get().load_image("monsters/monster_pencil.png", (TILE_SIZE, TILE_SIZE))
        if self.attack_angle != 0:
            surf = pygame.transform.rotate(surf, self.attack_angle)
            r = surf.get_rect(center=(px + TILE_SIZE // 2, py + TILE_SIZE // 2))
            screen.blit(surf, r.topleft)
        else:
            screen.blit(surf, (px, py))
            
        self.draw_hp_bar(screen, px, py)


# -------------------------------------------------------------
# 2. 샤프심 (MechanicalLeadMonster)
# 패턴: 축 정렬 시 직선/측면 고속 찌르기
# -------------------------------------------------------------
class MechanicalLeadMonster(MonsterBase):
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "샤프심", max_hp=35, move_speed=2.2)
        self.state = "wander" # wander, lock_on, dash_stab, cooldown
        self.state_timer = 1.0
        self.dash_dir = (0, 0)
        self.dash_dist_left = 0.0

    def update(self, dt, player, map_data, combat_system):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt
        dx = player.center_x - self.center_x
        dy = player.center_y - self.center_y

        if self.state == "wander":
            # 가로 또는 세로 축이 플레이어와 어느 정도 정렬되면 찌르기 락온
            if abs(dx) < 24 or abs(dy) < 24:
                self.state = "lock_on"
                self.state_timer = 0.6
                if abs(dx) < 24: # 세로 축 찌르기
                    self.dash_dir = (0, 1 if dy > 0 else -1)
                    self.telegraph_shape = {
                        "type": "rect",
                        "x": self.center_x - 8,
                        "y": min(self.center_y, player.center_y),
                        "w": 16,
                        "h": abs(dy) + 30
                    }
                else: # 가로 축 찌르기
                    self.dash_dir = (1 if dx > 0 else -1, 0)
                    self.telegraph_shape = {
                        "type": "rect",
                        "x": min(self.center_x, player.center_x),
                        "y": self.center_y - 8,
                        "w": abs(dx) + 30,
                        "h": 16
                    }
                self.telegraph_duration = 0.6
            else:
                # 서서히 플레이어 축으로 이동
                if abs(dx) > abs(dy):
                    self.move_and_collide(0, (1 if dy > 0 else -1) * self.move_speed * TILE_SIZE * 0.5 * dt, map_data)
                else:
                    self.move_and_collide((1 if dx > 0 else -1) * self.move_speed * TILE_SIZE * 0.5 * dt, 0, map_data)

        elif self.state == "lock_on":
            if self.state_timer <= 0:
                self.state = "dash_stab"
                self.state_timer = 0.35
                self.dash_dist_left = TILE_SIZE * 3.5
                self.telegraph_shape = None

        elif self.state == "dash_stab":
            step = 12.0 * TILE_SIZE * dt # 고속 돌진
            old_x, old_y = self.world_x, self.world_y
            self.move_and_collide(self.dash_dir[0] * step, self.dash_dir[1] * step, map_data)
            self.dash_dist_left -= step
            
            # 벽에 부딪혔으면 돌진 즉시 종료
            if abs(self.world_x - old_x) < 0.1 and abs(self.world_y - old_y) < 0.1 and step > 0.5:
                self.dash_dist_left = 0
            
            # 돌진 중 지속 히트박스
            combat_system.active_hitboxes.append(
                Hitbox(self.center_x, self.center_y, 18, damage=20, knockback=(self.dash_dir[0]*60, self.dash_dir[1]*60), source_type="monster")
            )
            
            if self.dash_dist_left <= 0 or self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.2


        elif self.state == "cooldown":
            if self.state_timer <= 0:
                self.state = "wander"
                self.state_timer = 0.8

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        surf = AssetManager.get().load_image("monsters/monster_lead.png", (TILE_SIZE, TILE_SIZE))
        screen.blit(surf, (px, py))
        self.draw_hp_bar(screen, px, py)


# -------------------------------------------------------------
# 3. 녹슨 용수철 (SpringMonster)
# 패턴: 튀어오른 뒤 공중 체공 후 플레이어 위치 찍기
# -------------------------------------------------------------
class SpringMonster(MonsterBase):
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "녹슨 용수철", max_hp=60, move_speed=1.2)
        self.state = "idle" # idle, jump_up, floating, slam_down, cooldown
        self.state_timer = 1.0
        self.jump_height = 0.0
        self.target_land_x = 0.0
        self.target_land_y = 0.0

    def update(self, dt, player, map_data, combat_system):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt

        if self.state == "idle":
            if self.state_timer <= 0:
                self.state = "jump_up"
                self.state_timer = 0.4
                self.target_land_x = player.world_x
                self.target_land_y = player.world_y
                # 착지 장판 예고
                self.telegraph_shape = {
                    "type": "circle",
                    "cx": self.target_land_x + TILE_SIZE // 2,
                    "cy": self.target_land_y + TILE_SIZE // 2,
                    "radius": 36
                }
                self.telegraph_duration = 0.9

        elif self.state == "jump_up":
            # 공중으로 도약
            self.jump_height += 180.0 * dt
            if self.state_timer <= 0:
                self.state = "floating"
                self.state_timer = 0.4

        elif self.state == "floating":
            # 목표 지점 상공으로 이동 (벽 밖으로 나가지 않도록 착지 지점 제한)
            step_x = (self.target_land_x - self.world_x) * 6.0 * dt
            step_y = (self.target_land_y - self.world_y) * 6.0 * dt
            self.move_and_collide(step_x, step_y, map_data)
            if self.state_timer <= 0:
                self.state = "slam_down"
                self.state_timer = 0.2

        elif self.state == "slam_down":
            self.jump_height -= 360.0 * dt
            if self.jump_height <= 0:
                self.jump_height = 0
                self.state = "cooldown"
                self.state_timer = 1.0
                self.telegraph_shape = None
                # 착지 충격파 히트박스
                combat_system.active_hitboxes.append(
                    Hitbox(self.center_x, self.center_y, 40, damage=25, knockback=(0, 40), source_type="monster")
                )

        elif self.state == "cooldown":
            if self.state_timer <= 0:
                self.state = "idle"
                self.state_timer = random.uniform(1.0, 1.8)

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = (self.world_y - self.jump_height) - camera_offset[1]
        
        # 바닥 그림자 (체공 중)
        if self.jump_height > 0:
            shadow_rect = pygame.Rect(self.world_x - camera_offset[0] + 8, self.world_y - camera_offset[1] + 28, TILE_SIZE - 16, 8)
            pygame.draw.ellipse(screen, (0, 0, 0, 100), shadow_rect)
            
        surf = AssetManager.get().load_image("monsters/monster_spring.png", (TILE_SIZE, TILE_SIZE))
        screen.blit(surf, (px, py))
        self.draw_hp_bar(screen, px, py)


# -------------------------------------------------------------
# 4. 얼룩진 핑크 형광펜 (HighlighterMonster)
# 패턴: 310도 광역 회전 치기
# -------------------------------------------------------------
class HighlighterMonster(MonsterBase):
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "핑크 형광펜", max_hp=55, move_speed=1.5)
        self.state = "chase" # chase, spin_windup, spinning, cooldown
        self.state_timer = 1.5
        self.spin_angle = 0.0

    def update(self, dt, player, map_data, combat_system):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt
        dx = player.center_x - self.center_x
        dy = player.center_y - self.center_y
        dist = math.sqrt(dx * dx + dy * dy)

        if self.state == "chase":
            if dist < TILE_SIZE * 1.8:
                self.state = "spin_windup"
                self.state_timer = 0.6
                self.telegraph_shape = {
                    "type": "circle",
                    "cx": self.center_x,
                    "cy": self.center_y,
                    "radius": 44
                }
                self.telegraph_duration = 0.6
            else:
                if dist > 0:
                    step = self.move_speed * TILE_SIZE * dt
                    self.move_and_collide((dx / dist) * step, (dy / dist) * step, map_data)

        elif self.state == "spin_windup":
            if self.state_timer <= 0:
                self.state = "spinning"
                self.state_timer = 0.45
                self.telegraph_shape = None
                self.spin_angle = 0.0

        elif self.state == "spinning":
            self.spin_angle += 720.0 * dt # 310도 이상 고속 회전
            # 회전 타격 히트박스
            combat_system.active_hitboxes.append(
                Hitbox(self.center_x, self.center_y, 44, damage=18, knockback=((dx/max(1,dist))*50, (dy/max(1,dist))*50), source_type="monster")
            )
            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.4

        elif self.state == "cooldown":
            self.spin_angle = 0.0
            if self.state_timer <= 0:
                self.state = "chase"
                self.state_timer = 2.0

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        surf = AssetManager.get().load_image("monsters/monster_highlighter.png", (TILE_SIZE, TILE_SIZE))
        if self.spin_angle != 0:
            rot_surf = pygame.transform.rotate(surf, self.spin_angle)
            r = rot_surf.get_rect(center=(px + TILE_SIZE // 2, py + TILE_SIZE // 2))
            screen.blit(rot_surf, r.topleft)
        else:
            screen.blit(surf, (px, py))
            
        self.draw_hp_bar(screen, px, py)


# -------------------------------------------------------------
# 5. 지우개 (EraserMonster)
# 패턴: 붉은색 범위 장판 예고 후 1.5초 뒤 전방 슬램 강타
# -------------------------------------------------------------
class EraserMonster(MonsterBase):
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "지우개", max_hp=80, move_speed=1.0)
        self.state = "patrol" # patrol, telegraph_slam, slam_impact, cooldown
        self.state_timer = 1.0
        self.slam_target_rect = None
        self.slam_tilt = 0.0

    def update(self, dt, player, map_data, combat_system):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt
        dx = player.center_x - self.center_x
        dy = player.center_y - self.center_y
        dist = math.sqrt(dx * dx + dy * dy)

        if self.state == "patrol":
            if dist < TILE_SIZE * 2.2:
                # 붉은색 장판 1.5초 예고 시작
                self.state = "telegraph_slam"
                self.state_timer = 1.5 # 정확히 1.5초 예고
                
                # 플레이어 방향 전방 장판 생성
                dir_x = 1 if dx >= 0 else -1
                self.slam_target_rect = {
                    "type": "rect",
                    "x": self.center_x + (0 if dir_x > 0 else -TILE_SIZE * 2),
                    "y": self.center_y - TILE_SIZE,
                    "w": TILE_SIZE * 2,
                    "h": TILE_SIZE * 2
                }
                self.telegraph_shape = self.slam_target_rect
                self.telegraph_duration = 1.5
            else:
                if dist > 0:
                    step = self.move_speed * TILE_SIZE * dt
                    self.move_and_collide((dx / dist) * step, (dy / dist) * step, map_data)


        elif self.state == "telegraph_slam":
            # 1.5초 동안 서서히 앞으로 기우는 전조 모션
            progress = 1.0 - (self.state_timer / 1.5)
            self.slam_tilt = progress * 20.0
            
            if self.state_timer <= 0:
                # 1.5초 경과: 앞으로 쿵 넘어지며 타격
                self.state = "slam_impact"
                self.state_timer = 0.3
                self.telegraph_shape = None
                self.slam_tilt = 80.0
                
                # 대형 바디 슬램 히트박스
                if self.slam_target_rect:
                    cx = self.slam_target_rect["x"] + self.slam_target_rect["w"] // 2
                    cy = self.slam_target_rect["y"] + self.slam_target_rect["h"] // 2
                    combat_system.active_hitboxes.append(
                        Hitbox(cx, cy, radius=TILE_SIZE * 1.1, damage=35, knockback=(0, 60), source_type="monster")
                    )

        elif self.state == "slam_impact":
            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.8 # 엎어진 후 일어나는 후딜레이

        elif self.state == "cooldown":
            self.slam_tilt = max(0.0, self.slam_tilt - 120.0 * dt)
            if self.state_timer <= 0:
                self.state = "patrol"
                self.state_timer = 1.0

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        surf = AssetManager.get().load_image("monsters/monster_eraser.png", (TILE_SIZE, TILE_SIZE))
        if self.slam_tilt != 0:
            rot_surf = pygame.transform.rotate(surf, -self.slam_tilt)
            r = rot_surf.get_rect(center=(px + TILE_SIZE // 2, py + TILE_SIZE // 2))
            screen.blit(rot_surf, r.topleft)
        else:
            screen.blit(surf, (px, py))
            
        self.draw_hp_bar(screen, px, py)
