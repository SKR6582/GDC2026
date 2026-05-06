"""
entity.py — 게임 엔티티 기본 클래스.
모든 게임 오브젝트(플레이어, 적, NPC 등)의 베이스.
"""

import pygame
from settings import Layers


class Entity(pygame.sprite.Sprite):
    """
    기본 엔티티. pygame.sprite.Sprite 를 확장.
    - pos: Vector2 기반 정밀 좌표
    - vel: 속도 벡터
    - _layer: 렌더링 레이어
    """

    def __init__(self, x: float, y: float, image: pygame.Surface, layer: int = Layers.ENTITIES):
        super().__init__()
        self.image = image
        self.rect = self.image.get_rect(topleft=(int(x), int(y)))
        self.pos = pygame.math.Vector2(x, y)
        self.vel = pygame.math.Vector2(0, 0)
        self._layer = layer

    def move(self, dt: float):
        """속도 벡터에 따라 위치 갱신."""
        self.pos += self.vel * dt
        self.rect.topleft = (int(self.pos.x), int(self.pos.y))

    def update(self, dt: float):
        """매 프레임 호출. 서브클래스에서 오버라이드."""
        self.move(dt)

    def draw(self, screen: pygame.Surface, camera=None):
        """카메라 오프셋을 적용하여 그리기."""
        if camera:
            screen.blit(self.image, camera.apply(self.rect))
        else:
            screen.blit(self.image, self.rect)
