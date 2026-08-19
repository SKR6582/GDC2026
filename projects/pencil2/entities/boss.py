import math
import random
import pygame
from settings import TILE_SIZE, COLOR_RED, COLOR_PURPLE, COLOR_GOLD, COLOR_WHITE, SCREEN_WIDTH
from engine.asset_manager import AssetManager
from engine.combat import Hitbox
from entities.monster_base import MonsterBase
from entities.monsters import PencilMonster, MechanicalLeadMonster, SpringMonster

class PencilCaseBoss(MonsterBase):
    """
    최종 보스: 필통 (Pencil Case)
    - 외형: 황갈색 거친 질감 + 내부 블랙 패브릭
    - 궁극 스킬: 입 개방 → 포탈 생성 → 일반 학용품 몬스터 웨이브 소환
    - 패턴 1: 돌진 물어뜯기 (Chomp Rush)
    - 패턴 2: 학용품 탄환 사방 투척 (Pencil Dart Barrage)
    """
    def __init__(self, tx, ty):
        super().__init__(tx, ty, "필통 (Pencil Case)", max_hp=300, move_speed=1.0)
        self.state = "intro" # intro, idle, portal_summon, chomp_rush, barrage, cooldown
        self.state_timer = 2.0
        self.mouth_open = False
        self.portal_glow_radius = 0.0
        self.summoned_monsters = []
        self.max_summons = 4

    @property
    def collision_rect(self):
        # 대형 보스 히트박스
        return pygame.Rect(int(self.world_x + 8), int(self.world_y + 8), TILE_SIZE * 2 - 16, TILE_SIZE * 2 - 16)

    @property
    def center_x(self):
        return self.world_x + TILE_SIZE

    @property
    def center_y(self):
        return self.world_y + TILE_SIZE

    def update(self, dt, player, map_data, combat_system, monster_list_ref):
        self.update_physics(dt, map_data)
        if not self.is_alive:
            return

        self.state_timer -= dt
        dx = player.center_x - self.center_x
        dy = player.center_y - self.center_y
        dist = math.sqrt(dx * dx + dy * dy)

        if self.state == "intro":
            if self.state_timer <= 0:
                self.state = "idle"
                self.state_timer = 1.5

        elif self.state == "idle":
            self.mouth_open = False
            # 플레이어 방향으로 천천히 이동 (2x2 크기 벽 충돌 검사)
            if dist > 0:
                step = self.move_speed * TILE_SIZE * dt
                self.move_and_collide((dx / dist) * step, (dy / dist) * step, map_data, size_tiles=2)

            if self.state_timer <= 0:
                # 패턴 선택 (소환 쿨다운 또는 공격 패턴)
                alive_summons = [m for m in self.summoned_monsters if m.is_alive]
                if len(alive_summons) < 2:
                    # 몬스터 소환 (궁극기: 영역 전개/포탈 소환)
                    self.state = "portal_summon"
                    self.state_timer = 3.0
                    self.mouth_open = True
                    self.telegraph_shape = {
                        "type": "circle",
                        "cx": self.center_x,
                        "cy": self.center_y + 30,
                        "radius": 50
                    }
                    self.telegraph_duration = 3.0
                else:
                    # 랜덤 패턴
                    choice = random.choice(["chomp_rush", "barrage"])
                    if choice == "chomp_rush":
                        self.state = "chomp_rush"
                        self.state_timer = 1.2
                        self.telegraph_shape = {
                            "type": "rect",
                            "x": min(self.center_x, player.center_x) - 20,
                            "y": min(self.center_y, player.center_y) - 20,
                            "w": abs(dx) + 40,
                            "h": abs(dy) + 40
                        }
                        self.telegraph_duration = 0.8
                    else:
                        self.state = "barrage"
                        self.state_timer = 2.0

        elif self.state == "portal_summon":
            # 입을 크게 벌리고 포탈 기운 팽창
            self.portal_glow_radius = min(40.0, self.portal_glow_radius + 40.0 * dt)
            
            # 중간 시점에 몬스터 소환
            if 1.0 <= self.state_timer <= 1.05 and len([m for m in self.summoned_monsters if m.is_alive]) < self.max_summons:
                m_type = random.choice([PencilMonster, MechanicalLeadMonster, SpringMonster])
                stx = int((self.center_x + random.randint(-40, 40)) // TILE_SIZE)
                sty = int((self.center_y + random.randint(30, 60)) // TILE_SIZE)
                if not map_data.is_wall(stx, sty):
                    spawned = m_type(stx, sty)
                    self.summoned_monsters.append(spawned)
                    monster_list_ref.append(spawned)
                    combat_system.spawn_damage_text(self.center_x, self.center_y - 20, "학용품 소환!", COLOR_PURPLE, is_crit=True)

            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 2.0
                self.telegraph_shape = None
                self.mouth_open = False

        elif self.state == "chomp_rush":
            # 플레이어를 향해 가속 돌진 후 깨물기 (벽 충돌 검사)
            step = 5.0 * TILE_SIZE * dt
            if dist > 0:
                self.move_and_collide((dx / dist) * step, (dy / dist) * step, map_data, size_tiles=2)

                
            combat_system.active_hitboxes.append(
                Hitbox(self.center_x, self.center_y, 48, damage=30, knockback=((dx/max(1,dist))*80, (dy/max(1,dist))*80), source_type="monster")
            )
            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.5
                self.telegraph_shape = None

        elif self.state == "barrage":
            # 사방으로 학용품 파편 탄막 발사
            if int(self.state_timer * 10) % 3 == 0:
                angle = random.uniform(0, math.pi * 2)
                bx = self.center_x + math.cos(angle) * 30
                by = self.center_y + math.sin(angle) * 30
                combat_system.active_hitboxes.append(
                    Hitbox(bx, by, 16, damage=15, knockback=(math.cos(angle)*40, math.sin(angle)*40), source_type="monster")
                )
            if self.state_timer <= 0:
                self.state = "cooldown"
                self.state_timer = 1.2

        elif self.state == "cooldown":
            self.portal_glow_radius = max(0.0, self.portal_glow_radius - 60.0 * dt)
            if self.state_timer <= 0:
                self.state = "idle"
                self.state_timer = 1.5

    def draw(self, screen, camera_offset):
        if not self.is_alive:
            return
        self.draw_telegraph(screen, camera_offset)
        px = self.world_x - camera_offset[0]
        py = self.world_y - camera_offset[1]
        
        # 포탈 소환 오라
        if self.portal_glow_radius > 0:
            portal_surf = pygame.Surface((int(self.portal_glow_radius * 2), int(self.portal_glow_radius * 2)), pygame.SRCALPHA)
            pygame.draw.circle(portal_surf, (150, 40, 220, 180), (int(self.portal_glow_radius), int(self.portal_glow_radius)), int(self.portal_glow_radius))
            pygame.draw.circle(portal_surf, (230, 120, 255, 230), (int(self.portal_glow_radius), int(self.portal_glow_radius)), int(self.portal_glow_radius * 0.6))
            screen.blit(portal_surf, (px + TILE_SIZE - self.portal_glow_radius, py + TILE_SIZE + 10 - self.portal_glow_radius))

        boss_surf = AssetManager.get().load_image("boss/pencil_case.png", (TILE_SIZE * 2, TILE_SIZE * 2))
        screen.blit(boss_surf, (px, py))

    def draw_boss_ui(self, screen, font):
        """화면 상단 대형 보스 체력바 렌더링"""
        if not self.is_alive:
            return
            
        bar_w = 400
        bar_h = 16
        bar_x = (SCREEN_WIDTH - bar_w) // 2
        bar_y = 20
        
        fill_w = int(bar_w * (self.hp / self.max_hp))
        
        # 보스 이름 텍스트
        name_surf = font.render(f"★ {self.name} ★", True, COLOR_GOLD)
        screen.blit(name_surf, ((SCREEN_WIDTH - name_surf.get_width()) // 2, bar_y - 20))
        
        # 체력 바 배경 & 게이지
        pygame.draw.rect(screen, (30, 20, 20), (bar_x, bar_y, bar_w, bar_h), border_radius=4)
        pygame.draw.rect(screen, COLOR_RED, (bar_x, bar_y, fill_w, bar_h), border_radius=4)
        pygame.draw.rect(screen, COLOR_GOLD, (bar_x, bar_y, bar_w, bar_h), 2, border_radius=4)
