"""
scene.py — 씬(Scene) 기반 상태 관리.
"""

from __future__ import annotations
from typing import TYPE_CHECKING, List, Optional
import pygame

if TYPE_CHECKING:
    from engine.game import Game


class Scene:
    """모든 씬의 기본 클래스."""

    def __init__(self, game: Game):
        self.game = game

    def on_enter(self):
        pass

    def on_exit(self):
        pass

    def handle_input(self, input_mgr):
        pass

    def update(self, dt: float):
        pass

    def draw(self, screen: pygame.Surface):
        pass


class SceneManager:
    """씬 스택 관리. change/push/pop 지원."""

    def __init__(self):
        self._stack: List[Scene] = []

    @property
    def current(self) -> Optional[Scene]:
        return self._stack[-1] if self._stack else None

    def change(self, scene: Scene):
        if self._stack:
            self._stack[-1].on_exit()
            self._stack.pop()
        self._stack.append(scene)
        scene.on_enter()

    def push(self, scene: Scene):
        self._stack.append(scene)
        scene.on_enter()

    def pop(self) -> Optional[Scene]:
        if not self._stack:
            return None
        old = self._stack.pop()
        old.on_exit()
        return old

    def handle_input(self, input_mgr):
        if self.current:
            self.current.handle_input(input_mgr)

    def update(self, dt: float):
        if self.current:
            self.current.update(dt)

    def draw(self, screen: pygame.Surface):
        for scene in self._stack:
            scene.draw(screen)
