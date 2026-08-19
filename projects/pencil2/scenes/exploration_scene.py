import math
import os
import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE,
    COLOR_DESK_WOOD, COLOR_WALL, COLOR_WHITE, COLOR_BLACK, COLOR_RED,
    COLOR_GOLD, COLOR_YELLOW, COLOR_BLUE, COLOR_GREEN, COLOR_PURPLE,
    TILE_WALKABLE, TILE_WALL, TILE_DECOR, TILE_INTERACT, TILE_PORTAL, TILE_GATE
)

from engine.scene_manager import Scene
from engine.asset_manager import AssetManager
from engine.combat import CombatSystem
from engine.transition import PortalCollapseTransition
from entities.player import Player
from entities.monsters import (
    PencilMonster, MechanicalLeadMonster, SpringMonster,
    HighlighterMonster, EraserMonster
)
from entities.boss import PencilCaseBoss

class ExplorationScene(Scene):
    """
    메인 탐험 & 실시간 전투 씬:
    - 바둑판 타일맵 & 픽셀 렌더러
    - 플레이어 4방향 이동 & 자 조합 블레이드 공격
    - 5종 몬스터 & 보스 실시간 전투
    - 포탈 도미노 붕괴 & 추락 트랜지션
    - 보스 관문(몬스터 전멸 시 키 획득) & 퍼즐 연동
    """
    def __init__(self, game, map_data, spawn_pos_override=None):
        super().__init__(game)
        self.map_data = map_data
        self.combat = CombatSystem()
        
        # 1. 플레이어 초기화
        sp_x = spawn_pos_override[0] if spawn_pos_override else map_data.player_spawn["x"]
        sp_y = spawn_pos_override[1] if spawn_pos_override else map_data.player_spawn["y"]
        self.player = Player(sp_x, sp_y)
        
        # 2. 몬스터 인스턴스화
        self.monsters = []
        self.boss = None
        self._spawn_monsters()
        
        # 3. 카메라
        self.camera_x = 0.0
        self.camera_y = 0.0
        
        # 4. 포탈 트랜지션 상태
        self.transition = None
        
        # 5. 배경 서피스 캐시
        self.bg_surf = None
        if map_data.background_path and os.path.exists(map_data.background_path):
            try:
                self.bg_surf = pygame.image.load(map_data.background_path).convert()
            except Exception:
                self.bg_surf = None
                
        # 6. 보스 게이트 룰 상태 (보스방 전멸 기믹)
        self.boss_key_spawned = False
        self.boss_key_pos = None

    def _spawn_monsters(self):
        for m_info in self.map_data.monsters:
            m_type = m_info.get("type", "pencil")
            tx = m_info.get("x", 5)
            ty = m_info.get("y", 5)
            
            if m_type == "pencil":
                self.monsters.append(PencilMonster(tx, ty))
            elif m_type == "lead":
                self.monsters.append(MechanicalLeadMonster(tx, ty))
            elif m_type == "spring":
                self.monsters.append(SpringMonster(tx, ty))
            elif m_type == "highlighter":
                self.monsters.append(HighlighterMonster(tx, ty))
            elif m_type == "eraser":
                self.monsters.append(EraserMonster(tx, ty))
            elif m_type == "boss":
                self.boss = PencilCaseBoss(tx, ty)
                self.monsters.append(self.boss)

    def handle_input(self, input_mgr):
        if self.transition:
            return # 트랜지션 중 입력 차단

        # 상호작용 (Space) - 퍼즐 또는 아이템 줍기
        if input_mgr.interact_pressed:
            self._handle_interaction()

        self.player.handle_input(input_mgr, self.map_data, self.combat)

    def _handle_interaction(self):
        from scenes.puzzle_scene import GeometricPuzzleScene
        
        # 플레이어 앞 타일 위치
        front_tx = self.player.tx + self.player.facing[0]
        front_ty = self.player.ty + self.player.facing[1]
        
        # 1. 바닥에 떨어진 보스 키 아이템 줍기
        if self.boss_key_pos and (self.player.tx, self.player.ty) == self.boss_key_pos:
            self.game.state.add_item("boss_key")
            self.combat.spawn_damage_text(self.player.center_x, self.player.world_y - 20, "★ 보스 키 획득! ★", COLOR_GOLD, is_crit=True)
            self.boss_key_pos = None
            return

        # 2. 퍼즐 오브젝트 상호작용
        for puz in self.map_data.puzzles:
            px, py = puz.get("x"), puz.get("y")
            # 플레이어가 인접해 있거나 마주보고 있을 때
            if (front_tx, front_ty) == (px, py) or (self.player.tx, self.player.ty) == (px, py) or (abs(self.player.tx - px) <= 1 and abs(self.player.ty - py) <= 1):
                puz_id = puz.get("id", "puzzle_1")
                if puz_id not in self.game.state.solved_puzzles:
                    def on_solved():
                        self.game.state.solved_puzzles.add(puz_id)
                        # 맵 전체의 모든 잠긴 문(TILE_GATE, 5)을 길(TILE_WALKABLE, 0)로 완전 개방
                        unlocked_count = 0
                        for ty in range(self.map_data.height):
                            for tx in range(self.map_data.width):
                                if self.map_data.tiles[ty][tx] == TILE_GATE:
                                    self.map_data.tiles[ty][tx] = TILE_WALKABLE
                                    unlocked_count += 1
                                    
                        self.combat.spawn_damage_text(self.player.center_x, self.player.world_y - 20, "★ 퍼즐 성공! 모든 게이트 개방! ★", COLOR_GOLD, is_crit=True)
                            
                    self.game.scene_manager.push(GeometricPuzzleScene(self.game, puz, on_solve=on_solved))
                    return


    def update(self, dt):
        if self.transition:
            self.transition.update(dt)
            return

        # 1. 플레이어 업데이트
        self.player.update(dt)

        # 2. 몬스터 업데이트 & AI
        for m in self.monsters:
            if isinstance(m, PencilCaseBoss):
                m.update(dt, self.player, self.map_data, self.combat, self.monsters)
            else:
                m.update(dt, self.player, self.map_data, self.combat)

        # 3. 보스 게이트 룰 체크 (모든 몹 전멸 시 키 드롭)
        if self.map_data.boss_gate_rule and not self.boss_key_spawned and not self.game.state.has_item("boss_key"):
            alive_count = sum(1 for m in self.monsters if m.is_alive)
            if alive_count == 0 and len(self.monsters) > 0:
                self.boss_key_spawned = True
                drop_pos = self.map_data.boss_gate_rule.get("drop_at", {"x": 5, "y": 5})
                self.boss_key_pos = (drop_pos["x"], drop_pos["y"])
                self.combat.spawn_damage_text(self.player.center_x, self.player.world_y - 20, "열쇠가 나타났습니다!", COLOR_GOLD, is_crit=True)

        # 4. 전투 시스템 판정 (히트박스 vs 엔티티)
        self._resolve_combat()
        self.combat.update(dt)

        # 5. 포탈 타일 진입 체크 (도미노 붕괴 트랜지션)
        curr_tile = self.map_data.tiles[self.player.ty][self.player.tx]
        if curr_tile == TILE_PORTAL and not self.player.is_moving:
            self._trigger_portal_transition()

        # 6. 카메라 스무스 트래킹
        target_cx = self.player.world_x + TILE_SIZE // 2 - SCREEN_WIDTH // 2
        target_cy = self.player.world_y + TILE_SIZE // 2 - SCREEN_HEIGHT // 2
        
        map_w_px = self.map_data.width * TILE_SIZE
        map_h_px = self.map_data.height * TILE_SIZE
        max_cx = max(0, map_w_px - SCREEN_WIDTH)
        max_cy = max(0, map_h_px - SCREEN_HEIGHT)
        
        self.camera_x += (max(0, min(target_cx, max_cx)) - self.camera_x) * 8.0 * dt
        self.camera_y += (max(0, min(target_cy, max_cy)) - self.camera_y) * 8.0 * dt

        # 7. 보스 처치 시 엔딩 전환 체크
        if self.boss and not self.boss.is_alive:
            self._trigger_ending()

    def _resolve_combat(self):
        # 플레이어 공격 -> 몬스터
        for hitbox in self.combat.active_hitboxes:
            if hitbox.source_type == "player":
                for m in self.monsters:
                    if m.is_alive and m not in hitbox.hit_entities:
                        if hitbox.check_collision(m.collision_rect):
                            m.take_damage(hitbox.damage, hitbox.knockback_vector, self.combat)
                            hitbox.hit_entities.add(m)
            elif hitbox.source_type == "monster":
                if not self.player.invulnerable_timer > 0 and self.player not in hitbox.hit_entities:
                    if hitbox.check_collision(self.player.collision_rect):
                        self.player.take_damage(hitbox.damage, self.combat)
                        hitbox.hit_entities.add(self.player)

    def _trigger_portal_transition(self):
        # 포탈 정보 찾기
        portal_info = None
        for p in self.map_data.portals:
            if p.get("x") == self.player.tx and p.get("y") == self.player.ty:
                portal_info = p
                break
                
        target_room = portal_info.get("target_room", "room_2") if portal_info else "room_2"
        req_item = portal_info.get("requires_item") if portal_info else None
        
        # 필요한 아이템(보스 키 등)이 있으면 체크
        if req_item and not self.game.state.has_item(req_item):
            self.combat.spawn_damage_text(self.player.center_x, self.player.world_y - 20, "잠겨있습니다! 열쇠가 필요합니다.", COLOR_RED)
            return

        def on_transition_finish():
            self.game.go_to_room(target_room)

        self.transition = PortalCollapseTransition(
            self.map_data,
            (self.player.tx, self.player.ty),
            self.player,
            self._get_tile_surface,
            on_transition_finish
        )

    def _trigger_ending(self):
        from scenes.story_scene import StoryScene
        from scenes.title_scene import TitleScene
        
        ending_dialogues = [
            {"speaker": "필통 보스", "text": "크윽... 학용품의 정령이여..."},
            {"speaker": "학용품 요정", "text": "훌륭하다. 너는 이 험난한 책상 위 모험을 통해 학용품의 가치를 깨달았구나."},
            {"speaker": "주인공", "text": "연필, 자, 지우개... 모두 내 곁을 지켜주던 소중한 친구들이었어...!"},
            {"speaker": "학용품 요정", "text": "진심으로 뉘우친 너를 용서하마. 이제 다시 인간으로 돌아가거라!"},
            {"speaker": "나레이션", "text": "빛과 함께 주인공은 인간으로 돌아왔고, 이후 세상에서 가장 열정적인 '학용품 덕후'가 되었다! [HAPPY ENDING]"}
        ]
        
        def return_to_title():
            self.game.scene_manager.change(TitleScene(self.game))
            
        self.game.scene_manager.push(StoryScene(self.game, ending_dialogues, on_finish=return_to_title))

    def _get_tile_surface(self, tx, ty):
        tile_type = self.map_data.tiles[ty][tx]
        if tile_type == TILE_WALL:
            return AssetManager.get().load_image("tiles/tile_wall.png", (TILE_SIZE, TILE_SIZE))
        else:
            return AssetManager.get().load_image("tiles/tile_wood.png", (TILE_SIZE, TILE_SIZE))

    def draw(self, screen):
        cam = (self.camera_x, self.camera_y)

        if self.transition:
            # 도미노 붕괴 연출 렌더링
            player_surf = AssetManager.get().load_image("player/hero.png", (TILE_SIZE, TILE_SIZE))
            self.transition.draw(screen, cam, player_surf)
            return

        # 1. 배경 (책상 나무 텍스처 / 이미지)
        if self.bg_surf:
            screen.blit(self.bg_surf, (-int(self.camera_x * 0.4), -int(self.camera_y * 0.4)))
        else:
            screen.fill((25, 20, 18))

        # 2. 타일맵 렌더링
        start_tx = max(0, int(self.camera_x // TILE_SIZE))
        end_tx = min(self.map_data.width, int((self.camera_x + SCREEN_WIDTH) // TILE_SIZE) + 2)
        start_ty = max(0, int(self.camera_y // TILE_SIZE))
        end_ty = min(self.map_data.height, int((self.camera_y + SCREEN_HEIGHT) // TILE_SIZE) + 2)

        for ty in range(start_ty, end_ty):
            for tx in range(start_tx, end_tx):
                t_type = self.map_data.tiles[ty][tx]
                rx = tx * TILE_SIZE - self.camera_x
                ry = ty * TILE_SIZE - self.camera_y
                
                # 바닥/벽 서피스
                tile_img = self._get_tile_surface(tx, ty)
                screen.blit(tile_img, (rx, ry))

                # 포탈 타일 연출 (보라색 소용돌이 룬)
                if t_type == TILE_PORTAL:
                    p_surf = pygame.Surface((TILE_SIZE, TILE_SIZE), pygame.SRCALPHA)
                    pygame.draw.circle(p_surf, (160, 60, 240, 150), (TILE_SIZE // 2, TILE_SIZE // 2), TILE_SIZE // 2 - 4)
                    pygame.draw.circle(p_surf, (220, 150, 255, 220), (TILE_SIZE // 2, TILE_SIZE // 2), TILE_SIZE // 4)
                    screen.blit(p_surf, (rx, ry))
                elif t_type == TILE_GATE: # 잠긴 문
                    pygame.draw.rect(screen, (90, 30, 30), (rx, ry, TILE_SIZE, TILE_SIZE))
                    pygame.draw.rect(screen, COLOR_GOLD, (rx + 8, ry + 8, TILE_SIZE - 16, TILE_SIZE - 16), 2)

        # 3. 스폰 오브젝트 (연필깎이)
        sp_rx = self.map_data.player_spawn["x"] * TILE_SIZE - self.camera_x
        sp_ry = self.map_data.player_spawn["y"] * TILE_SIZE - self.camera_y
        sharpener_surf = AssetManager.get().load_image("objects/sharpener.png", (TILE_SIZE, TILE_SIZE))
        screen.blit(sharpener_surf, (sp_rx, sp_ry))

        # 4. 퍼즐 오브젝트
        for puz in self.map_data.puzzles:
            p_rx = puz.get("x", 0) * TILE_SIZE - self.camera_x
            p_ry = puz.get("y", 0) * TILE_SIZE - self.camera_y
            pygame.draw.rect(screen, COLOR_GOLD, (p_rx + 6, p_ry + 6, TILE_SIZE - 12, TILE_SIZE - 12), border_radius=4)
            p_txt = AssetManager.get().get_font(16).render("?", True, COLOR_WHITE)
            screen.blit(p_txt, (p_rx + TILE_SIZE//2 - p_txt.get_width()//2, p_ry + TILE_SIZE//2 - p_txt.get_height()//2))

        # 5. 드롭된 보스 키 아이템
        if self.boss_key_pos:
            kx = self.boss_key_pos[0] * TILE_SIZE - self.camera_x
            ky = self.boss_key_pos[1] * TILE_SIZE - self.camera_y
            pygame.draw.circle(screen, COLOR_GOLD, (int(kx + TILE_SIZE // 2), int(ky + TILE_SIZE // 2)), 12)
            k_txt = AssetManager.get().get_font(14).render("KEY", True, COLOR_BLACK)
            screen.blit(k_txt, (kx + 10, ky + 16))

        # 6. 몬스터 렌더링
        for m in self.monsters:
            m.draw(screen, cam)

        # 7. 플레이어 렌더링
        self.player.draw(screen, cam)

        # 8. 전투 이펙트 & 팝업 텍스트
        self.combat.draw_effects(screen, cam, AssetManager.get().get_font(18))

        # 9. UI & HUD 렌더링
        self._draw_hud(screen)

    def _draw_hud(self, screen):
        font = AssetManager.get().get_font(18)
        
        # 플레이어 HP 바
        hp_w = 180
        hp_h = 16
        fill_w = int(hp_w * (self.player.hp / self.player.max_hp))
        pygame.draw.rect(screen, (40, 20, 20), (20, 20, hp_w, hp_h), border_radius=3)
        pygame.draw.rect(screen, COLOR_RED, (20, 20, fill_w, hp_h), border_radius=3)
        pygame.draw.rect(screen, COLOR_WHITE, (20, 20, hp_w, hp_h), 2, border_radius=3)
        
        hp_txt = font.render(f"HP {self.player.hp}/{self.player.max_hp}", True, COLOR_WHITE)
        screen.blit(hp_txt, (24, 20))

        # 스킬 차지 게이지
        if self.player.is_charging:
            charge_pct = min(1.0, self.player.charge_timer / 1.0)
            cg_w = 120
            cg_fill = int(cg_w * charge_pct)
            cg_col = COLOR_GOLD if self.player.is_fully_charged else COLOR_BLUE
            pygame.draw.rect(screen, (20, 20, 30), (20, 44, cg_w, 8), border_radius=2)
            pygame.draw.rect(screen, cg_col, (20, 44, cg_fill, 8), border_radius=2)
            c_txt = font.render("CHARGE READY!" if self.player.is_fully_charged else "CHARGING...", True, cg_col)
            screen.blit(c_txt, (148, 40))

        # 인벤토리/키 상태
        if self.game.state.has_item("boss_key"):
            key_badge = font.render("★ 보스 키 보유 중", True, COLOR_GOLD)
            screen.blit(key_badge, (20, 60))

        # 보스 UI (보스룸일 경우)
        if self.boss:
            self.boss.draw_boss_ui(screen, AssetManager.get().get_font(20))

        # 하단 조작 가이드
        guide_txt = font.render("[WASD / 방향키] 4방향 이동  |  [J] 일반 휘두르기  |  [K (1초 홀드)] 차지 공격  |  [SPACE] 상호작용", True, (200, 200, 210))
        screen.blit(guide_txt, (20, SCREEN_HEIGHT - 30))
