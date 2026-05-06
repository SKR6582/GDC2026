"""
battle_scene.py — 전투 및 방 이동 처리 (핵심 플레이 루프)
"""

import pygame
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors

class BattleScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.theme = self.game.state.get_current_theme()

    def on_enter(self):
        self.font = self.game.assets.load_font(None, 40)
        self.sub_font = self.game.assets.load_font(None, 24)

    def handle_input(self, input_mgr):
        # ENTER를 누르면 다음 방으로 진행
        if input_mgr.key_pressed(pygame.K_RETURN):
            self._advance_room()

    def _advance_room(self):
        room_num = self.game.state.next_room()
        
        # 이벤트 체크
        event = self.game.state.is_event_room()
        
        if event == "minigame":
            from scenes.minigame_scene import MinigameScene
            self.game.scene_manager.change(MinigameScene(self.game))
        elif event == "story":
            from scenes.story_scene import StoryScene
            self.game.scene_manager.change(StoryScene(self.game))
        elif room_num > self.game.state.max_rooms:
            from scenes.ending_scene import EndingScene
            self.game.scene_manager.change(EndingScene(self.game, "good"))
        else:
            # 다음 방도 전투면 현재 씬 재시작 (테마 갱신을 위해)
            self.game.scene_manager.change(BattleScene(self.game))

    def update(self, dt):
        pass

    def draw(self, screen):
        # 테마 배경색 적용
        screen.fill(self.theme["bg"])
        
        # 방 정보 표시
        room_text = f"ROOM {self.game.state.current_room}"
        theme_text = f"지역: {self.theme['name']}"
        
        t_surf = self.font.render(room_text, True, Colors.WHITE)
        n_surf = self.sub_font.render(theme_text, True, self.theme["accent"])
        
        screen.blit(t_surf, t_surf.get_rect(center=(WINDOW_WIDTH // 2, 100)))
        screen.blit(n_surf, n_surf.get_rect(center=(WINDOW_WIDTH // 2, 150)))
        
        # 안내
        hint = self.sub_font.render("ENTER를 눌러 다음 방으로 (전투 승리 가정)", True, Colors.LIGHT_GRAY)
        screen.blit(hint, hint.get_rect(center=(WINDOW_WIDTH // 2, WINDOW_HEIGHT - 100)))
