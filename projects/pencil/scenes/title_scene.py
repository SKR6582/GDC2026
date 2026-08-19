"""
title_scene.py — 타이틀 화면 씬 (틀).
"""

import pygame
import math
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors


class TitleScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.menu_items = ["게임 시작", "미니게임", "맵 테스트", "종료"]
        self.selected = 0
        self.elapsed = 0.0

    def on_enter(self):
        self.title_font = self.game.assets.load_font(None, 64)
        self.menu_font = self.game.assets.load_font(None, 36)
        self.hint_font = self.game.assets.load_font(None, 20)

    def handle_input(self, input_mgr):
        if input_mgr.key_pressed(pygame.K_UP):
            self.selected = (self.selected - 1) % len(self.menu_items)
        if input_mgr.key_pressed(pygame.K_DOWN):
            self.selected = (self.selected + 1) % len(self.menu_items)
        if input_mgr.key_pressed(pygame.K_RETURN):
            self._select()

    def _select(self):
        from scenes.story_scene import StoryScene
        from scenes.minigame_scene import MinigameScene
        from scenes.exploration_scene import ExplorationScene

        if self.selected == 0:
            self.game.state.reset()
            self.game.scene_manager.change(StoryScene(self.game))
        elif self.selected == 1:
            self.game.scene_manager.change(MinigameScene(self.game))
        elif self.selected == 2:
            self.game.scene_manager.change(ExplorationScene(self.game, dev_mode=True, room_id=1))
        elif self.selected == 3:
            self.game.running = False

    def update(self, dt):
        self.elapsed += dt

    def draw(self, screen):
        screen.fill(Colors.DARK_BG)

        # 타이틀 (떠다니는 효과)
        bob = math.sin(self.elapsed * 2.0) * 8
        t = self.title_font.render("PENCIL", True, Colors.WHITE)
        screen.blit(t, t.get_rect(center=(WINDOW_WIDTH // 2, 160 + bob)))

        # 메뉴
        for i, item in enumerate(self.menu_items):
            color = Colors.CYAN if i == self.selected else Colors.LIGHT_GRAY
            prefix = "> " if i == self.selected else "  "
            s = self.menu_font.render(f"{prefix}{item}", True, color)
            screen.blit(s, s.get_rect(center=(WINDOW_WIDTH // 2, 320 + i * 60)))

        # 하단 안내
        h = self.hint_font.render("UP/DOWN: 선택  |  ENTER: 확인  |  ESC: 종료", True, Colors.MID_GRAY)
        screen.blit(h, h.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT - 40)))
