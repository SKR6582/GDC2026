import math
import pygame
from settings import (
    TILE_SIZE, PLAYER_MOVE_SPEED, PLAYER_MAX_HP,
    PLAYER_BASIC_ATTACK_COOLDOWN, PLAYER_BASIC_DAMAGE,
    PLAYER_CHARGE_TIME, PLAYER_SKILL_DAMAGE,
    COLOR_YELLOW, COLOR_GOLD, COLOR_WHITE, COLOR_CHARGING_AURA
)
from engine.asset_manager import AssetManager
from engine.combat import Hitbox

class Player:
    def __init__(self, tx, ty):
        # 타일 좌표 및 월드 좌표
        self.tx = tx
        self.ty = ty
        self.target_tx = tx
        self.target_ty = ty
        self.world_x = tx * TILE_SIZE
        self.world_y = ty * TILE_SIZE
        self.is_moving = False
        
        # 방향: (0, 1)=하, (0, -1)=상, (-1, 0)=좌, (1, 0)=우
        self.facing = (0, 1)
        
        # 체력 및 상태
        self.max_hp = PLAYER_MAX_HP
        self.hp = PLAYER_MAX_HP
        self.invulnerable_timer = 0.0
        self.invulnerable_duration = 0.6
        
        # 공격 및 스킬 상태
        self.attack_cooldown_timer = 0.0
        self.attack_anim_timer = 0.0
        self.attack_anim_duration = 0.22
        self.is_attacking = False
        self.attack_is_skill = False
        self.attack_swing_angle = 0.0
        
        # 차지 이펙트
        self.charge_timer = 0.0
        self.is_charging = False
        self.is_fully_charged = False

    @property
    def center_x(self):
        return self.world_x + TILE_SIZE // 2

    @property
    def center_y(self):
        return self.world_y + TILE_SIZE // 2

    @property
    def collision_rect(self):
        return pygame.Rect(self.world_x + 8, self.world_y + 8, TILE_SIZE - 16, TILE_SIZE - 16)

    def handle_input(self, input_mgr, map_data, combat_system):
        # 1. 이동 처리 (현재 타일 이동 중이 아닐 때만 다음 타일 입력 수신)
        if not self.is_moving:
            move_vec = input_mgr.get_move_vector()
            if move_vec != (0, 0):
                self.facing = move_vec
                nxt_tx = self.tx + move_vec[0]
                nxt_ty = self.ty + move_vec[1]
                
                # 벽 충돌 체크
                if not map_data.is_wall(nxt_tx, nxt_ty):
                    self.target_tx = nxt_tx
                    self.target_ty = nxt_ty
                    self.is_moving = True

        # 2. 스킬 차지 상태 추적
        self.is_charging = input_mgr.skill_holding
        self.charge_timer = input_mgr.skill_charge_timer
        self.is_fully_charged = input_mgr.skill_is_charged

        # 3. 공격 격발 판정 (이동 중에도 즉시 공격 가능)
        if self.attack_cooldown_timer <= 0:
            # 3-1. 1초 차지 스킬 릴리즈 격발
            if input_mgr.skill_released and input_mgr.skill_is_charged:
                self._execute_attack(combat_system, is_skill=True)
            # 3-2. 일반 공격 (J키 / Z키 / 마우스 좌클릭)
            elif input_mgr.attack_pressed:
                self._execute_attack(combat_system, is_skill=False)


    def _execute_attack(self, combat_system, is_skill=False):
        self.is_attacking = True
        self.attack_is_skill = is_skill
        self.attack_anim_timer = self.attack_anim_duration
        self.attack_cooldown_timer = PLAYER_BASIC_ATTACK_COOLDOWN if not is_skill else 0.55
        
        # 히트박스 생성
        reach = 1.3 if not is_skill else 1.8
        hx = self.center_x + self.facing[0] * (TILE_SIZE * reach)
        hy = self.center_y + self.facing[1] * (TILE_SIZE * reach)
        radius = 28 if not is_skill else 48
        dmg = PLAYER_BASIC_DAMAGE if not is_skill else PLAYER_SKILL_DAMAGE
        knockback = (self.facing[0] * (80.0 if is_skill else 40.0), self.facing[1] * (80.0 if is_skill else 40.0))
        
        hitbox = Hitbox(hx, hy, radius, dmg, knockback, source_type="player")
        combat_system.active_hitboxes.append(hitbox)

    def update(self, dt):
        # 쿨다운 및 무적 시간
        if self.attack_cooldown_timer > 0:
            self.attack_cooldown_timer -= dt
        if self.invulnerable_timer > 0:
            self.invulnerable_timer -= dt
            
        # 공격 스윙 애니메이션
        if self.is_attacking:
            self.attack_anim_timer -= dt
            # 스윙 각도 계산 (-60도 -> +60도)
            progress = 1.0 - (self.attack_anim_timer / self.attack_anim_duration)
            self.attack_swing_angle = -70.0 + progress * 140.0
            if self.attack_anim_timer <= 0:
                self.is_attacking = False

        # 타일 간 보간 이동
        if self.is_moving:
            target_wx = self.target_tx * TILE_SIZE
            target_wy = self.target_ty * TILE_SIZE
            
            dx = target_wx - self.world_x
            dy = target_wy - self.world_y
            dist = math.sqrt(dx * dx + dy * dy)
            step = PLAYER_MOVE_SPEED * TILE_SIZE * dt
            
            if dist <= step:
                self.world_x = target_wx
                self.world_y = target_wy
                self.tx = self.target_tx
                self.ty = self.target_ty
                self.is_moving = False
            else:
                self.world_x += (dx / dist) * step
                self.world_y += (dy / dist) * step

    def take_damage(self, damage, combat_system):
        if self.invulnerable_timer > 0:
            return False
            
        self.hp = max(0, self.hp - damage)
        self.invulnerable_timer = self.invulnerable_duration
        combat_system.spawn_damage_text(self.center_x, self.world_y - 10, f"-{damage}", (255, 80, 80))
        return True

    def draw(self, screen, camera_offset):
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        # 무적 깜빡임 연출
        if self.invulnerable_timer > 0 and int(self.invulnerable_timer * 15) % 2 == 0:
            return
            
        # 1. 차지 중 빛/오라 이펙트 (1초 이상 차징 시 화려한 황금빛 오라)
        if self.is_charging:
            aura_radius = 24 + int(8 * math.sin(pygame.time.get_ticks() * 0.015))
            aura_surf = pygame.Surface((aura_radius * 2, aura_radius * 2), pygame.SRCALPHA)
            aura_color = COLOR_GOLD if self.is_fully_charged else COLOR_CHARGING_AURA
            pygame.draw.circle(aura_surf, aura_color, (aura_radius, aura_radius), aura_radius)
            screen.blit(aura_surf, (px + TILE_SIZE // 2 - aura_radius, py + TILE_SIZE // 2 - aura_radius))

        # 2. 플레이어 본체 스프라이트
        player_surf = AssetManager.get().load_image("player/hero.png", (TILE_SIZE, TILE_SIZE))
        screen.blit(player_surf, (px, py))

        # 3. 무기 (자 조합 블레이드) 렌더링
        self._draw_weapon(screen, px, py)

    def _draw_weapon(self, screen, px, py):
        weapon_surf = AssetManager.get().load_image("items/ruler_weapon.png", (20, 38))
        cx = px + TILE_SIZE // 2
        cy = py + TILE_SIZE // 2
        
        # 기본 방향별 각도
        base_angle = 0
        if self.facing == (0, -1):  # 상
            base_angle = 0
        elif self.facing == (0, 1): # 하
            base_angle = 180
        elif self.facing == (-1, 0):# 좌
            base_angle = 90
        elif self.facing == (1, 0): # 우
            base_angle = -90

        if self.is_attacking:
            # 공격 스윙 중
            current_angle = base_angle + self.attack_swing_angle
            rot_w = pygame.transform.rotate(weapon_surf, current_angle)
            if self.attack_is_skill:
                # 스킬 공격 시 검신 발광 이펙트 (크기 확대)
                rot_w = pygame.transform.scale2x(rot_w)
            w_rect = rot_w.get_rect(center=(cx + self.facing[0] * 22, cy + self.facing[1] * 22))
            screen.blit(rot_w, w_rect.topleft)
        else:
            # 평상시 등/손 위치에 휴대
            rot_w = pygame.transform.rotate(weapon_surf, base_angle - 25)
            w_rect = rot_w.get_rect(center=(cx + 12, cy))
            screen.blit(rot_w, w_rect.topleft)
