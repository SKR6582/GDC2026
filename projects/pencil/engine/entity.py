"""
entity.py — 탑다운(Top-down) 이동에 최적화된 엔티티 베이스
"""

import pygame
from typing import List, Tuple
from settings import Layers

class Entity(pygame.sprite.Sprite):
    def __init__(self, x: float, y: float, width: int, height: int, color: Tuple[int, int, int], layer: int = Layers.ENTITIES):
        super().__init__()
        self.image = pygame.Surface((width, height))
        self.image.fill(color)
        self.rect = self.image.get_rect(topleft=(int(x), int(y)))
        self.pos = pygame.math.Vector2(x, y)
        self.vel = pygame.math.Vector2(0, 0)
        self._layer = layer

    def move_and_collide(self, dt: float, obstacles: List[pygame.Rect]):
        """탑다운 상하좌우 충돌 처리"""
        # 1. 수평 이동 및 충돌
        if self.vel.x != 0:
            self.pos.x += self.vel.x * dt
            self.rect.x = int(self.pos.x)
            self._handle_collision(obstacles, 'x')
            
        # 2. 수직 이동 및 충돌
        if self.vel.y != 0:
            self.pos.y += self.vel.y * dt
            self.rect.y = int(self.pos.y)
            self._handle_collision(obstacles, 'y')

    def _handle_collision(self, obstacles: List[pygame.Rect], direction: str):
        for wall in obstacles:
            if self.rect.colliderect(wall):
                if direction == 'x':
                    if self.vel.x > 0: self.rect.right = wall.left
                    elif self.vel.x < 0: self.rect.left = wall.right
                    self.pos.x = self.rect.x
                
                if direction == 'y':
                    if self.vel.y > 0: self.rect.bottom = wall.top
                    elif self.vel.y < 0: self.rect.top = wall.bottom
                    self.pos.y = self.rect.y

    def draw(self, screen: pygame.Surface, camera=None):
        if camera:
            screen.blit(self.image, camera.apply(self.rect))
        else:
            screen.blit(self.image, self.rect)
