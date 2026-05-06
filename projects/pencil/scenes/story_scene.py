"""
story_scene.py — 스토리(대화) 씬 (틀).
여기에 대화 시스템, 텍스트 연출 등을 구현할 것.
"""

import pygame
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors


class StoryScene(Scene):
    def __init__(self, game):
        super().__init__(game)

    def on_enter(self):
        self.font = self.game.assets.load_font(None, 32)
        self.hint_font = self.game.assets.load_font(None, 20)

    def handle_input(self, input_mgr):
        # ENTER로 다음 씬(전투)으로 전환
        if input_mgr.key_pressed(pygame.K_RETURN):
            from scenes.battle_scene import BattleScene
            self.game.scene_manager.change(BattleScene(self.game))

    def update(self, dt):
        pass

    def draw(self, screen):
        screen.fill(Colors.DARK_BG)
        t = self.font.render("[ Story Scene ]", True, Colors.WHITE)
        screen.blit(t, t.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2)))
        h = self.hint_font.render("ENTER: 전투로 이동", True, Colors.MID_GRAY)
        screen.blit(h, h.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 50)))
