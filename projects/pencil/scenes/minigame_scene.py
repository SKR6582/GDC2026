"""
minigame_scene.py — 미니게임 씬 (틀).
여기에 미니게임 로직을 구현할 것.
"""

import pygame
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors


class MinigameScene(Scene):
    def __init__(self, game):
        super().__init__(game)

    def on_enter(self):
        self.font = self.game.assets.load_font(None, 32)
        self.hint_font = self.game.assets.load_font(None, 20)

    def handle_input(self, input_mgr):
        if input_mgr.key_pressed(pygame.K_RETURN):
            from scenes.title_scene import TitleScene
            self.game.scene_manager.change(TitleScene(self.game))

    def update(self, dt):
        pass

    def draw(self, screen):
        screen.fill(Colors.DARK_BG)
        t = self.font.render("[ Minigame Scene ]", True, Colors.YELLOW)
        screen.blit(t, t.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2)))
        h = self.hint_font.render("ENTER: 타이틀로 돌아가기", True, Colors.MID_GRAY)
        screen.blit(h, h.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 50)))
