"""
input_manager.py — 키보드·마우스 입력 상태를 프레임 단위로 추적.
held / just_pressed / just_released 를 구분할 수 있는 고급 입력 시스템.
"""

import pygame


class InputManager:
    """프레임 시작 시 update()를 호출하면, 그 프레임 동안의 입력 상태를 질의할 수 있다."""

    def __init__(self):
        self._keys_held: set[int] = set()
        self._keys_pressed: set[int] = set()   # 이번 프레임에 눌린 키
        self._keys_released: set[int] = set()  # 이번 프레임에 떼어진 키

        self._mouse_held: set[int] = set()     # 0=좌, 1=중, 2=우
        self._mouse_pressed: set[int] = set()
        self._mouse_released: set[int] = set()
        self._mouse_pos: tuple[int, int] = (0, 0)
        self._mouse_rel: tuple[int, int] = (0, 0)  # 마우스 이동량

        self._quit_requested: bool = False
        self._events: list[pygame.event.Event] = []

    # ── 매 프레임 호출 ────────────────────────────────
    def update(self):
        """이벤트 큐를 소비하고 내부 상태를 갱신한다."""
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
                btn = event.button - 1  # pygame 1-indexed → 0-indexed
                self._mouse_held.add(btn)
                self._mouse_pressed.add(btn)
            elif event.type == pygame.MOUSEBUTTONUP:
                btn = event.button - 1
                self._mouse_held.discard(btn)
                self._mouse_released.add(btn)

    # ── 이벤트 목록 ──────────────────────────────────
    @property
    def events(self) -> list[pygame.event.Event]:
        """이번 프레임의 raw 이벤트 목록."""
        return self._events

    # ── 종료 요청 ────────────────────────────────────
    @property
    def quit_requested(self) -> bool:
        return self._quit_requested

    # ── 키보드 질의 ──────────────────────────────────
    def key_held(self, key: int) -> bool:
        """키가 지금 눌려 있는가?"""
        return key in self._keys_held

    def key_pressed(self, key: int) -> bool:
        """키가 이번 프레임에 처음 눌렸는가?"""
        return key in self._keys_pressed

    def key_released(self, key: int) -> bool:
        """키가 이번 프레임에 떼어졌는가?"""
        return key in self._keys_released

    # ── 마우스 질의 ──────────────────────────────────
    @property
    def mouse_pos(self) -> tuple[int, int]:
        return self._mouse_pos

    @property
    def mouse_rel(self) -> tuple[int, int]:
        return self._mouse_rel

    def mouse_button_held(self, button: int = 0) -> bool:
        """마우스 버튼이 눌려 있는가? (0=좌, 1=중, 2=우)"""
        return button in self._mouse_held

    def mouse_button_pressed(self, button: int = 0) -> bool:
        """마우스 버튼이 이번 프레임에 클릭되었는가?"""
        return button in self._mouse_pressed

    def mouse_button_released(self, button: int = 0) -> bool:
        """마우스 버튼이 이번 프레임에 떼어졌는가?"""
        return button in self._mouse_released
