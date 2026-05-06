"""
camera.py — 2D 월드 카메라.
타겟을 부드럽게 추적(lerp)하며, 월드 경계 클램핑을 지원한다.
"""

import pygame
from settings import WINDOW_WIDTH, WINDOW_HEIGHT


class Camera:
    """
    사용법:
        camera = Camera(world_width, world_height)
        camera.set_target(player)          # player는 .rect 속성 필요
        camera.update(dt)
        screen.blit(some_surf, camera.apply(some_rect))
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
        self._target: object | None = None

    def set_target(self, target):
        """target 은 .rect 속성(pygame.Rect)을 가진 객체."""
        self._target = target

    def set_world_size(self, w: int, h: int):
        """맵 크기가 바뀔 때 호출."""
        self.world_width = w
        self.world_height = h

    def update(self, dt: float):
        """매 프레임 호출. dt는 초 단위."""
        if self._target is None:
            return

        # 목표 오프셋: 타겟을 화면 중앙에 놓는 값
        target_x = self._target.rect.centerx - WINDOW_WIDTH // 2
        target_y = self._target.rect.centery - WINDOW_HEIGHT // 2

        # lerp 보간으로 부드러운 추적
        t = min(self.lerp_speed * dt, 1.0)
        self.offset.x += (target_x - self.offset.x) * t
        self.offset.y += (target_y - self.offset.y) * t

        # 월드 경계 클램핑
        self.offset.x = max(0, min(self.offset.x, self.world_width - WINDOW_WIDTH))
        self.offset.y = max(0, min(self.offset.y, self.world_height - WINDOW_HEIGHT))

    def apply(self, rect: pygame.Rect) -> pygame.Rect:
        """월드 좌표 Rect → 스크린 좌표 Rect 변환."""
        return rect.move(-int(self.offset.x), -int(self.offset.y))

    def apply_pos(self, pos: tuple[float, float]) -> tuple[int, int]:
        """월드 좌표 (x, y) → 스크린 좌표 변환."""
        return (int(pos[0] - self.offset.x), int(pos[1] - self.offset.y))

    def screen_to_world(self, screen_pos: tuple[int, int]) -> tuple[int, int]:
        """스크린 좌표 → 월드 좌표 역변환. (마우스 클릭 처리 등에 사용)"""
        return (
            int(screen_pos[0] + self.offset.x),
            int(screen_pos[1] + self.offset.y),
        )
