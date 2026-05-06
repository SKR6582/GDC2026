"""
input_manager.py — 입력 상태 추적 시스템.
"""

import pygame
from typing import Set, Tuple, List


class InputManager:
    """프레임 단위로 키보드와 마우스 상태를 관리."""

    def __init__(self):
        self._keys_held: Set[int] = set()
        self._keys_pressed: Set[int] = set()
        self._keys_released: Set[int] = set()

        self._mouse_held: Set[int] = set()
        self._mouse_pressed: Set[int] = set()
        self._mouse_released: Set[int] = set()
        self._mouse_pos: Tuple[int, int] = (0, 0)
        self._mouse_rel: Tuple[int, int] = (0, 0)

        self._quit_requested: bool = False
        self._events: List[pygame.event.Event] = []

    def update(self):
        self._keys_pressed.clear()
        self._keys_released.clear()
        self._mouse_pressed.clear()
        self._mouse_released.clear()
        self._mouse_pos = pygame.mouse.get_pos()
        self._mouse_rel = pygame.mouse.get_rel()

        self._events = pygame.event.get()
        for event in self._events:
            if event.type == pygame.QUIT:
                self._quit_requested = True

            elif event.type == pygame.KEYDOWN:
                self._keys_held.add(event.key)
                self._keys_pressed.add(event.key)
            elif event.type == pygame.KEYUP:
                self._keys_held.discard(event.key)
                self._keys_released.add(event.key)

            elif event.type == pygame.MOUSEBUTTONDOWN:
                btn = event.button - 1
                self._mouse_held.add(btn)
                self._mouse_pressed.add(btn)
            elif event.type == pygame.MOUSEBUTTONUP:
                btn = event.button - 1
                self._mouse_held.discard(btn)
                self._mouse_released.add(btn)

    @property
    def events(self) -> List[pygame.event.Event]:
        return self._events

    @property
    def quit_requested(self) -> bool:
        return self._quit_requested

    def key_held(self, key: int) -> bool:
        return key in self._keys_held

    def key_pressed(self, key: int) -> bool:
        return key in self._keys_pressed

    def key_released(self, key: int) -> bool:
        return key in self._keys_released

    @property
    def mouse_pos(self) -> Tuple[int, int]:
        return self._mouse_pos

    @property
    def mouse_rel(self) -> Tuple[int, int]:
        return self._mouse_rel

    def mouse_button_held(self, button: int = 0) -> bool:
        return button in self._mouse_held

    def mouse_button_pressed(self, button: int = 0) -> bool:
        return button in self._mouse_pressed

    def mouse_button_released(self, button: int = 0) -> bool:
        return button in self._mouse_released
