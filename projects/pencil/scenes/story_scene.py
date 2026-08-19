"""
story_scene.py — JSON 데이터 기반 스토리 시스템
"""

import pygame
import json
import os
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, ASSETS_DIR

class StoryScene(Scene):
    def __init__(self, game, story_id=None, pop_on_end=False):
        super().__init__(game)
        self.story_id = story_id
        self.pop_on_end = pop_on_end
        self.current_index = 0
        self.waiting_for_choice = False
        self.dialogues = []
        self.characters = {}
        
        # 데이터 로드
        self._load_characters()
        self._load_story_data()
        
        self.choice_rects = []
        self.hovered_choice = -1

    def _load_characters(self):
        path = os.path.join(ASSETS_DIR, "data", "characters.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.characters = json.load(f)

    def _load_story_data(self):
        room_id = self.game.state.current_room
        if self.story_id:
            path = os.path.join(ASSETS_DIR, "data", "stories", f"{self.story_id}.json")
        else:
            path = os.path.join(ASSETS_DIR, "data", "stories", f"room{room_id}.json")
        
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.dialogues = json.load(f)
        else:
            # 파일이 없을 경우 기본 텍스트 (에러 방지)
            self.dialogues = [{"type": "text", "char_id": "system", "content": f"Room {room_id}의 스토리 파일이 없습니다.", "side": "center", "next": "end"}]

    def on_enter(self):
        self.font_main = self.game.assets.load_font(None, 28)
        self.font_name = self.game.assets.load_font(None, 32)
        self.bg_color = (20, 20, 30)

    def handle_input(self, input_mgr):
        if self.waiting_for_choice:
            if input_mgr.mouse_button_pressed(0) and self.hovered_choice != -1:
                choice = self.dialogues[self.current_index]["options"][self.hovered_choice]
                self._proceed(choice["next"])
            return

        if input_mgr.mouse_button_pressed(0) or input_mgr.key_pressed(pygame.K_SPACE) or input_mgr.key_pressed(pygame.K_p):
            curr = self.dialogues[self.current_index]
            self._proceed(curr.get("next", self.current_index + 1))

    def _proceed(self, next_idx):
        if next_idx == "end":
            if self.pop_on_end:
                self.game.scene_manager.pop()
            else:
                from scenes.exploration_scene import ExplorationScene
                self.game.scene_manager.change(ExplorationScene(self.game))
            return

        self.current_index = int(next_idx)
        if self.current_index < len(self.dialogues):
            self.waiting_for_choice = (self.dialogues[self.current_index]["type"] == "choice")
        else:
            if self.pop_on_end:
                self.game.scene_manager.pop()
            else:
                from scenes.exploration_scene import ExplorationScene
                self.game.scene_manager.change(ExplorationScene(self.game))

    def update(self, dt):
        if self.waiting_for_choice:
            mouse_pos = pygame.mouse.get_pos()
            self.hovered_choice = -1
            for i, rect in enumerate(self.choice_rects):
                if rect.collidepoint(mouse_pos):
                    self.hovered_choice = i
                    break

    def draw(self, screen):
        screen.fill(self.bg_color)
        if self.current_index >= len(self.dialogues): return
        curr = self.dialogues[self.current_index]
        
        if curr["type"] == "text":
            char_info = self.characters.get(curr["char_id"], self.characters["system"])
            self._draw_characters(screen, curr, char_info)
            self._draw_dialogue_box(screen, curr, char_info)
        elif curr["type"] == "choice":
            self._draw_choices(screen, curr)

    def _draw_characters(self, screen, curr, char_info):
        positions = {"left": (WINDOW_WIDTH * 0.25, WINDOW_HEIGHT * 0.6), "right": (WINDOW_WIDTH * 0.75, WINDOW_HEIGHT * 0.6), "center": (WINDOW_WIDTH * 0.5, WINDOW_HEIGHT * 0.6)}
        # 현재 말하는 캐릭터 강조
        for side, pos in positions.items():
            is_active = (curr["side"] == side)
            color = char_info["color"] if is_active else (60, 60, 70)
            rect = pygame.Rect(0, 0, 200, 400)
            rect.center = pos
            pygame.draw.rect(screen, color, rect, border_radius=20)
            pygame.draw.rect(screen, Colors.WHITE, rect, 2 if is_active else 1, border_radius=20)

    def _draw_dialogue_box(self, screen, curr, char_info):
        box_h = 200
        box_rect = pygame.Rect(50, WINDOW_HEIGHT - box_h - 50, WINDOW_WIDTH - 100, box_h)
        s = pygame.Surface((box_rect.width, box_rect.height), pygame.SRCALPHA)
        pygame.draw.rect(s, (30, 30, 50, 220), (0, 0, box_rect.width, box_rect.height), border_radius=15)
        screen.blit(s, box_rect.topleft)
        pygame.draw.rect(screen, Colors.WHITE, box_rect, 2, border_radius=15)
        
        # 이름표
        name_rect = pygame.Rect(box_rect.x + 20, box_rect.y - 45, 180, 40)
        pygame.draw.rect(screen, char_info["color"], name_rect, border_radius=10)
        pygame.draw.rect(screen, Colors.WHITE, name_rect, 2, border_radius=10)
        name_surf = self.font_name.render(char_info["name"], True, Colors.WHITE)
        screen.blit(name_surf, (name_rect.centerx - name_surf.get_width()//2, name_rect.centery - name_surf.get_height()//2))
        
        # 본문
        text_surf = self.font_main.render(curr["content"], True, Colors.WHITE)
        screen.blit(text_surf, (box_rect.x + 40, box_rect.y + 40))

    def _draw_choices(self, screen, curr):
        self.choice_rects = []
        options = curr["options"]
        start_y = WINDOW_HEIGHT // 2 - (len(options) * 60) // 2
        q_surf = self.font_name.render(curr["question"], True, Colors.WHITE)
        screen.blit(q_surf, (WINDOW_WIDTH//2 - q_surf.get_width()//2, start_y - 80))

        for i, opt in enumerate(options):
            rect = pygame.Rect(WINDOW_WIDTH//2 - 300, start_y + i * 80, 600, 60)
            self.choice_rects.append(rect)
            color = (100, 100, 200) if self.hovered_choice == i else (50, 50, 70)
            pygame.draw.rect(screen, color, rect, border_radius=30)
            pygame.draw.rect(screen, Colors.WHITE, rect, 2, border_radius=30)
            opt_surf = self.font_main.render(opt["text"], True, Colors.WHITE)
            screen.blit(opt_surf, (rect.centerx - opt_surf.get_width()//2, rect.centery - opt_surf.get_height()//2))
