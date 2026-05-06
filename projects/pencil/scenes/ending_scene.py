"""
ending_scene.py — 엔딩 씬 (틀).
ending_id 에 따라 3가지 엔딩을 분기 표시.
"""

import pygame
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors

ENDING_DATA = {
    "good":   {"title": "Good Ending",   "color": Colors.CYAN},
    "normal": {"title": "Normal Ending", "color": Colors.YELLOW},
    "bad":    {"title": "Bad Ending",    "color": Colors.RED},
}


class EndingScene(Scene):
    def __init__(self, game, ending_id: str = "normal"):
        super().__init__(game)
        self.ending_id = ending_id

    def on_enter(self):
        self.title_font = self.game.assets.load_font(None, 48)
        self.hint_font = self.game.assets.load_font(None, 20)
        data = ENDING_DATA.get(self.ending_id, ENDING_DATA["normal"])
        self.ending_title = data["title"]
        self.ending_color = data["color"]

    def handle_input(self, input_mgr):
        if input_mgr.key_pressed(pygame.K_RETURN):
            from scenes.title_scene import TitleScene
            self.game.scene_manager.change(TitleScene(self.game))

    def update(self, dt):
        pass

    def draw(self, screen):
        screen.fill(Colors.DARK_BG)
        t = self.title_font.render(self.ending_title, True, self.ending_color)
        screen.blit(t, t.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 - 20)))
        h = self.hint_font.render("ENTER: 타이틀로 돌아가기", True, Colors.MID_GRAY)
        screen.blit(h, h.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT // 2 + 40)))
