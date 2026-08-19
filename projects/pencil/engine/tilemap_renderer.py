"""
tilemap_renderer.py — 타일맵 배경·타일·플레이어 렌더링 공통 모듈
"""

import math
from typing import Optional
import pygame

from settings import WINDOW_WIDTH, WINDOW_HEIGHT, TILE_SIZE, THEMES
from engine.map_loader import MapData


class TilemapRenderer:
    def __init__(self):
        self.elapsed = 0.0

    def update(self, dt: float):
        self.elapsed += dt

    def draw_background(self, screen, camera, map_data: MapData, bg_surface: Optional[pygame.Surface]):
        if bg_surface:
            dr = camera.apply(pygame.Rect(0, 0, map_data.grid_w * TILE_SIZE, map_data.grid_h * TILE_SIZE))
            screen.fill((30, 30, 35))
            screen.blit(bg_surface, (dr.x, dr.y))
        else:
            theme = THEMES.get(map_data.theme, THEMES["DESK_WOOD"])
            screen.fill(theme["bg"])

    def draw_tiles(self, screen, camera, map_data: MapData, bg_surface: Optional[pygame.Surface]):
        cx, cy = camera.offset.x, camera.offset.y
        start_x = max(0, int(cx // TILE_SIZE) - 1)
        end_x = min(map_data.grid_w, int((cx + WINDOW_WIDTH) // TILE_SIZE) + 2)
        start_y = max(0, int(cy // TILE_SIZE) - 1)
        end_y = min(map_data.grid_h, int((cy + WINDOW_HEIGHT) // TILE_SIZE) + 2)

        for y in range(start_y, end_y):
            for x in range(start_x, end_x):
                cell = map_data.grid[y][x]
                tr = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                dtr = camera.apply(tr)

                if not bg_surface:
                    pygame.draw.line(screen, (140, 105, 70), (dtr.x, dtr.bottom), (dtr.right, dtr.bottom))
                    pygame.draw.line(screen, (140, 105, 70), (dtr.right, dtr.y), (dtr.right, dtr.bottom))
                else:
                    pygame.draw.line(screen, (255, 255, 255, 30), (dtr.x, dtr.bottom), (dtr.right, dtr.bottom))
                    pygame.draw.line(screen, (255, 255, 255, 30), (dtr.right, dtr.y), (dtr.right, dtr.bottom))

                if cell.type == 1:
                    pygame.draw.rect(screen, (220, 200, 180), (dtr.x, dtr.y - 16, dtr.w, dtr.h + 16), border_radius=4)
                    pygame.draw.rect(screen, (240, 220, 200), (dtr.x, dtr.y - 16, dtr.w, 16), border_radius=4)
                    pygame.draw.rect(screen, (180, 160, 140), (dtr.x, dtr.y - 16, dtr.w, dtr.h + 16), 1, border_radius=4)
                elif cell.type == 2:
                    pygame.draw.circle(screen, (80, 180, 80), dtr.center, 8)
                elif cell.type == 3:
                    box = pygame.Rect(dtr.x + 8, dtr.y + 8, TILE_SIZE - 16, TILE_SIZE - 16)
                    pulse = math.sin(self.elapsed * 6.0) * 2
                    pygame.draw.rect(screen, (255, 215, 0), box.inflate(pulse, pulse), border_radius=4)
                    pygame.draw.rect(screen, (200, 150, 0), box.inflate(pulse, pulse), 2, border_radius=4)
                    pygame.draw.circle(screen, (80, 50, 10), box.center, 3)
                elif cell.type == 4:
                    pulse = abs(math.sin(self.elapsed * 4.0)) * 6
                    pygame.draw.circle(screen, (140, 100, 220), dtr.center, 10 + int(pulse), 2)
                    pygame.draw.circle(screen, (100, 70, 180), dtr.center, 5)

    @staticmethod
    def draw_player(screen, camera, logic_x: float, logic_y: float, facing_x: int, facing_y: int):
        px_world = logic_x * TILE_SIZE + TILE_SIZE // 2
        py_world = logic_y * TILE_SIZE + TILE_SIZE // 2
        px_screen, py_screen = camera.apply_pos((px_world, py_world))

        pygame.draw.circle(screen, (255, 220, 80), (px_screen, py_screen), 16)
        pygame.draw.circle(screen, (180, 160, 60), (px_screen, py_screen), 16, 2)
        tip_x = px_screen + facing_x * 12
        tip_y = py_screen + facing_y * 12
        pygame.draw.circle(screen, (230, 50, 50), (int(tip_x), int(tip_y)), 4)

    @staticmethod
    def load_bg_surface(assets, map_data: MapData) -> Optional[pygame.Surface]:
        if not map_data.bg_image:
            return None
        try:
            raw = assets.load_image(map_data.bg_image)
            return pygame.transform.scale(raw, (map_data.grid_w * TILE_SIZE, map_data.grid_h * TILE_SIZE))
        except Exception:
            return None
