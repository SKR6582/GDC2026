"""
camera.py — 2D 월드 카메라.
"""

import pygame
from typing import Optional, Tuple
from settings import WINDOW_WIDTH, WINDOW_HEIGHT


class Camera:
    """
    타겟을 부드럽게 추적하며 월드 경계를 제한하는 카메라.
    """

    def __init__(
        self,
        world_width: int = WINDOW_WIDTH,
        world_height: int = WINDOW_HEIGHT,
        lerp_speed: float = 5.0,
    ):
        self.offset = pygame.math.Vector2(0, 0)
        self.world_width = world_width
        self.world_height = world_height
        self.lerp_speed = lerp_speed
        self._target: Optional[object] = None

    def set_target(self, target):
        self._target = target

    def set_world_size(self, w: int, h: int):
        self.world_width = w
        self.world_height = h

    def update(self, dt: float):
        if self._target is None:
            return

        target_x = self._target.rect.centerx - WINDOW_WIDTH // 2
        target_y = self._target.rect.centery - WINDOW_HEIGHT // 2

        t = min(self.lerp_speed * dt, 1.0)
        self.offset.x += (target_x - self.offset.x) * t
        self.offset.y += (target_y - self.offset.y) * t

        self.offset.x = max(0, min(self.offset.x, self.world_width - WINDOW_WIDTH))
        self.offset.y = max(0, min(self.offset.y, self.world_height - WINDOW_HEIGHT))

    def apply(self, rect: pygame.Rect) -> pygame.Rect:
        return rect.move(-int(self.offset.x), -int(self.offset.y))

    def apply_pos(self, pos: Tuple[float, float]) -> Tuple[int, int]:
        return (int(pos[0] - self.offset.x), int(pos[1] - self.offset.y))

    def screen_to_world(self, screen_pos: Tuple[int, int]) -> Tuple[int, int]:
        return (
            int(screen_pos[0] + self.offset.x),
            int(screen_pos[1] + self.offset.y),
        )
