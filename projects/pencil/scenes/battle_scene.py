"""
battle_scene.py — 전투 씬 (틀).
여기에 턴제/액션 전투 로직을 구현할 것.
"""

import pygame
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors


class BattleScene(Scene):
    def __init__(self, game):
        super().__init__(game)

    def on_enter(self):
        self.font = self.game.assets.load_font(None, 32)
        self.hint_font = self.game.assets.load_font(None, 20)

    def handle_input(self, input_mgr):
        # 1/2/3 키로 엔딩 분기 테스트
        if input_mgr.key_pressed(pygame.K_1):
            from scenes.ending_scene import EndingScene
            self.game.scene_manager.change(EndingScene(self.game, "good"))
        if input_mgr.key_pressed(pygame.K_2):
            from scenes.ending_scene import EndingScene
            self.game.scene_manager.change(EndingScene(self.game, "normal"))
        if input_mgr.key_pressed(pygame.K_3):
            from scenes.ending_scene import EndingScene
            self.game.scene_manager.change(EndingScene(self.game, "bad"))

    def update(self, dt):
        pass

    def draw(self, screen):
        screen.fill(Colors.DARK_BG)
        t = self.font.render("[ Battle Scene ]", True, Colors.RED)
        screen.blit(t, t.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 30)))
        h = self.hint_font.render("1: Good Ending  |  2: Normal Ending  |  3: Bad Ending", True, Colors.MID_GRAY)
        screen.blit(h, h.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 30)))
