import math
import pygame
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE

class DominoTile:
    def __init__(self, tx, ty, px, py, base_surf, delay):
        self.tx = tx
        self.ty = ty
        self.world_x = tx * TILE_SIZE
        self.world_y = ty * TILE_SIZE
        self.base_surf = base_surf
        self.delay = delay          # 붕괴 시작 대기 시간 (초)
        
        # 물리 상태
        self.timer = 0.0
        self.is_falling = False
        self.offset_y = 0.0
        self.fall_speed = 0.0
        self.rotation_angle = 0.0
        self.rot_speed = 180.0 if (tx % 2 == 0) else -180.0 # 좌우 번갈아 도미노 회전

    def update(self, dt, current_time):
        if current_time >= self.delay:
            self.is_falling = True
            
        if self.is_falling:
            self.fall_speed += 1200.0 * dt # 중력 가속도
            self.offset_y += self.fall_speed * dt
            self.rotation_angle += self.rot_speed * dt

    def draw(self, screen, camera_offset):
        if self.offset_y > SCREEN_HEIGHT + 200:
            return # 화면 밖 컬링
            
        draw_x = self.world_x - camera_offset[0]
        draw_y = self.world_y - camera_offset[1] + self.offset_y
        
        if self.rotation_angle != 0:
            rotated = pygame.transform.rotate(self.base_surf, self.rotation_angle)
            rect = rotated.get_rect(center=(draw_x + TILE_SIZE // 2, draw_y + TILE_SIZE // 2))
            screen.blit(rotated, rect.topleft)
        else:
            screen.blit(self.base_surf, (draw_x, draw_y))


class PortalCollapseTransition:
    """
    포탈 도미노 무너짐 & 플레이어 추락 연출기
    - 포탈에서 가장 먼 외곽 타일부터 양옆으로 순차 붕괴
    - 마지막에 플레이어 추락 후 완료 콜백 호출
    """
    def __init__(self, map_data, portal_pos, player, tile_surface_getter, on_complete_callback):
        self.portal_tx, self.portal_ty = portal_pos
        self.player = player
        self.on_complete = on_complete_callback
        self.elapsed_time = 0.0
        self.is_finished = False
        
        # 맵 타일 도미노 목록 구성
        self.domino_tiles = []
        max_dist = 0.0
        
        tile_dists = []
        for ty in range(map_data.height):
            for tx in range(map_data.width):
                # 포탈과의 유클리드 거리 + 가로 방향 가중치 (양옆 우선 붕괴감 강화)
                dx = tx - self.portal_tx
                dy = ty - self.portal_ty
                dist = math.sqrt(dx * dx * 1.5 + dy * dy)
                tile_dists.append((dist, tx, ty))
                if dist > max_dist:
                    max_dist = dist
                    
        # 거리가 먼(외곽) 순서대로 정렬 (포탈에서 먼 쪽부터 도미노 붕괴 시작)
        tile_dists.sort(key=lambda item: -item[0])
        
        total_collapse_duration = 1.2 # 전체 타일 붕괴 시작 시간 범위 (초)
        for rank, (dist, tx, ty) in enumerate(tile_dists):
            # 외곽부터 딜레이 부여
            delay = (1.0 - (dist / (max_dist + 0.001))) * 0.2 + (rank / len(tile_dists)) * total_collapse_duration
            surf = tile_surface_getter(tx, ty)
            self.domino_tiles.append(DominoTile(tx, ty, tx * TILE_SIZE, ty * TILE_SIZE, surf, delay))
            
        self.player_fall_start_time = total_collapse_duration + 0.3
        self.player_falling = False
        self.player_offset_y = 0.0
        self.player_rot_angle = 0.0
        self.player_fall_speed = 0.0
        self.total_duration = self.player_fall_start_time + 1.0

    def update(self, dt):
        self.elapsed_time += dt
        
        # 타일들 붕괴 업데이트
        for tile in self.domino_tiles:
            tile.update(dt, self.elapsed_time)
            
        # 플레이어 추락 업데이트
        if self.elapsed_time >= self.player_fall_start_time:
            self.player_falling = True
            self.player_fall_speed += 1400.0 * dt
            self.player_offset_y += self.player_fall_speed * dt
            self.player_rot_angle += 240.0 * dt
            
        if self.elapsed_time >= self.total_duration and not self.is_finished:
            self.is_finished = True
            if self.on_complete:
                self.on_complete()

    def draw(self, screen, camera_offset, player_surf):
        # 1. 붕괴되는 타일들 렌더링
        for tile in self.domino_tiles:
            tile.draw(screen, camera_offset)
            
        # 2. 플레이어 렌더링 (추락 포함)
        px = self.player.world_x - camera_offset[0]
        py = self.player.world_y - camera_offset[1] + self.player_offset_y
        
        if self.player_rot_angle != 0:
            rot_p = pygame.transform.rotate(player_surf, self.player_rot_angle)
            r_rect = rot_p.get_rect(center=(px + TILE_SIZE // 2, py + TILE_SIZE // 2))
            screen.blit(rot_p, r_rect.topleft)
        else:
            screen.blit(player_surf, (px, py))
            
        # 3. 마지막 암전 페이드
        if self.elapsed_time >= self.player_fall_start_time + 0.4:
            fade_progress = min(1.0, (self.elapsed_time - (self.player_fall_start_time + 0.4)) / 0.6)
            fade_surf = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            fade_surf.fill((0, 0, 0))
            fade_surf.set_alpha(int(fade_progress * 255))
            screen.blit(fade_surf, (0, 0))
