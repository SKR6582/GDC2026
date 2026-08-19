import pygame
from settings import (
    KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT,
    KEY_ATTACK, KEY_SKILL, KEY_INTERACT, KEY_CANCEL,
    PLAYER_CHARGE_TIME
)

class InputManager:
    """
    4방향 전용 입력 관리자:
    - 대각선 이동 완전 차단
    - 좀비고 스타일의 4방향 우선순위 스택 유지
    - 1초 차지 스킬(홀드 시간 추적 및 릴리즈 격발)
    - 상호작용 및 공격 원샷 트리거
    """
    def __init__(self):
        # 방향키 입력 순서 스택 (가장 최근에 누른 단일 축 방향만 유효)
        self.dir_stack = []
        
        # 키 상태 플래그
        self.attack_pressed = False
        self.interact_pressed = False
        self.cancel_pressed = False
        
        # 메뉴 내비게이션 전용 단발/키반복 트리거
        self.menu_nav_triggered = (0, 0)
        self.menu_repeat_timer = 0.0
        self.menu_repeat_delay = 0.22 # 최초 반복 지연
        self.menu_repeat_interval = 0.12 # 연속 반복 간격
        
        # 스킬 차지 관련
        self.skill_holding = False
        self.skill_charge_timer = 0.0
        self.skill_released = False
        self.skill_is_charged = False

    def handle_event(self, event):
        if event.type == pygame.KEYDOWN:
            # 4방향 입력
            nav = (0, 0)
            if event.key in KEY_UP:
                nav = (0, -1)
                self._push_dir((0, -1))
            elif event.key in KEY_DOWN:
                nav = (0, 1)
                self._push_dir((0, 1))
            elif event.key in KEY_LEFT:
                nav = (-1, 0)
                self._push_dir((-1, 0))
            elif event.key in KEY_RIGHT:
                nav = (1, 0)
                self._push_dir((1, 0))

            if nav != (0, 0):
                self.menu_nav_triggered = nav
                self.menu_repeat_timer = self.menu_repeat_delay

            # 액션 키 (기본 공격, 차지 스킬, 상호작용)
            if event.key in KEY_ATTACK:
                self.attack_pressed = True
            elif event.key in KEY_SKILL:
                self.skill_holding = True
                self.skill_charge_timer = 0.0
                self.skill_is_charged = False
            elif event.key in KEY_INTERACT:
                self.interact_pressed = True
            elif event.key in KEY_CANCEL:
                self.cancel_pressed = True

        elif event.type == pygame.KEYUP:
            # 4방향 해제
            if event.key in KEY_UP:
                self._remove_dir((0, -1))
            elif event.key in KEY_DOWN:
                self._remove_dir((0, 1))
            elif event.key in KEY_LEFT:
                self._remove_dir((-1, 0))
            elif event.key in KEY_RIGHT:
                self._remove_dir((1, 0))

            # 스킬 키 릴리즈 (차지 격발 판정)
            elif event.key in KEY_SKILL:
                if self.skill_holding:
                    if self.skill_charge_timer >= PLAYER_CHARGE_TIME:
                        self.skill_released = True
                        self.skill_is_charged = True
                    self.skill_holding = False
                    self.skill_charge_timer = 0.0

        # 마우스 조작 지원 (마우스 좌클릭: 일반 공격, 마우스 우클릭: 차지 스킬)
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1: # 좌클릭
                self.attack_pressed = True
            elif event.button == 3: # 우클릭 (차지 시작)
                self.skill_holding = True
                self.skill_charge_timer = 0.0
                self.skill_is_charged = False

        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 3: # 우클릭 릴리즈
                if self.skill_holding:
                    if self.skill_charge_timer >= PLAYER_CHARGE_TIME:
                        self.skill_released = True
                        self.skill_is_charged = True
                    self.skill_holding = False
                    self.skill_charge_timer = 0.0


    def update(self, dt):
        # 차지 타이머 누적
        if self.skill_holding:
            self.skill_charge_timer += dt
            if self.skill_charge_timer >= PLAYER_CHARGE_TIME:
                self.skill_is_charged = True

        # 메뉴 키 반복 처리
        if self.dir_stack:
            self.menu_repeat_timer -= dt
            if self.menu_repeat_timer <= 0:
                self.menu_nav_triggered = self.dir_stack[-1]
                self.menu_repeat_timer = self.menu_repeat_interval

    def clear_frame_triggers(self):
        """매 프레임 종료 시 일회성 액션 트리거 리셋"""
        self.attack_pressed = False
        self.interact_pressed = False
        self.cancel_pressed = False
        self.skill_released = False
        self.menu_nav_triggered = (0, 0)

    def get_move_vector(self):
        """현재 유효한 단일 방향 벡터 반환 (실시간 이동용)"""
        if not self.dir_stack:
            return (0, 0)
        return self.dir_stack[-1]

    def get_menu_nav_vector(self):
        """메뉴/UI 전용 단발성 방향 벡터 반환 (커서가 순식간에 지나가지 않음)"""
        return self.menu_nav_triggered


    def _push_dir(self, direction):
        if direction in self.dir_stack:
            self.dir_stack.remove(direction)
        self.dir_stack.append(direction)

    def _remove_dir(self, direction):
        if direction in self.dir_stack:
            self.dir_stack.remove(direction)
