import os
import json
import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, COLOR_WHITE, COLOR_GOLD,
    COLOR_BLACK, DIALOGUE_FONT_SIZE
)
from engine.scene_manager import Scene
from engine.asset_manager import AssetManager

class StoryScene(Scene):
    """대화 및 스토리 진행 씬"""
    def __init__(self, game, story_path_or_dialogues, on_finish=None):
        super().__init__(game)
        self.dialogues = []
        self.current_idx = 0
        self.on_finish = on_finish
        self.char_index = 0
        self.typewriter_timer = 0.0
        self.typewriter_speed = 0.03 # 글자 출력 속도 (초/글자)
        
        # 파일 경로면 로드
        if isinstance(story_path_or_dialogues, str):
            if os.path.exists(story_path_or_dialogues):
                with open(story_path_or_dialogues, "r", encoding="utf-8") as f:
                    self.dialogues = json.load(f).get("dialogues", [])
        elif isinstance(story_path_or_dialogues, list):
            self.dialogues = story_path_or_dialogues

        if not self.dialogues:
            self.dialogues = [{"speaker": "...", "text": "..."}]

    def handle_input(self, input_mgr):
        if input_mgr.interact_pressed or input_mgr.attack_pressed:
            current_diag = self.dialogues[self.current_idx]
            # 글자가 아직 다 안 나왔으면 즉시 전체 텍스트 표시
            if self.char_index < len(current_diag.get("text", "")):
                self.char_index = len(current_diag.get("text", ""))
            else:
                # 다음 대사로
                self.current_idx += 1
                self.char_index = 0
                if self.current_idx >= len(self.dialogues):
                    if self.on_finish:
                        self.on_finish()
                    else:
                        self.game.scene_manager.pop()

    def update(self, dt):
        current_diag = self.dialogues[self.current_idx]
        full_text = current_diag.get("text", "")
        if self.char_index < len(full_text):
            self.typewriter_timer += dt
            if self.typewriter_timer >= self.typewriter_speed:
                self.typewriter_timer = 0.0
                self.char_index += 1

    def draw(self, screen):
        # 반투명 어두운 배경 오버레이
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((10, 10, 15, 200))
        screen.blit(overlay, (0, 0))

        if self.current_idx >= len(self.dialogues):
            return

        diag = self.dialogues[self.current_idx]
        speaker = diag.get("speaker", "???")
        full_text = diag.get("text", "")
        displayed_text = full_text[:self.char_index]

        font = AssetManager.get().get_font(DIALOGUE_FONT_SIZE)
        name_font = AssetManager.get().get_font(DIALOGUE_FONT_SIZE + 4)

        # 대화창 박스
        box_w = SCREEN_WIDTH - 80
        box_h = 160
        box_x = 40
        box_y = SCREEN_HEIGHT - box_h - 40

        box_surf = pygame.Surface((box_w, box_h), pygame.SRCALPHA)
        box_surf.fill((25, 20, 25, 240))
        pygame.draw.rect(box_surf, COLOR_GOLD, (0, 0, box_w, box_h), 2, border_radius=8)
        screen.blit(box_surf, (box_x, box_y))

        # 화자 이름
        spk_surf = name_font.render(f"【 {speaker} 】", True, COLOR_GOLD)
        screen.blit(spk_surf, (box_x + 20, box_y + 16))

        # 대사 렌더링 (줄바꿈 지원)
        lines = []
        words = displayed_text.split(" ")
        curr_line = ""
        for w in words:
            test_line = curr_line + (" " if curr_line else "") + w
            if font.size(test_line)[0] < box_w - 60:
                curr_line = test_line
            else:
                lines.append(curr_line)
                curr_line = w
        if curr_line:
            lines.append(curr_line)

        for i, line in enumerate(lines):
            line_surf = font.render(line, True, COLOR_WHITE)
            screen.blit(line_surf, (box_x + 24, box_y + 55 + i * 28))

        # 안내 가이드
        guide_surf = AssetManager.get().get_font(16).render("[SPACE / J] 다음", True, (160, 160, 180))
        screen.blit(guide_surf, (box_x + box_w - 120, box_y + box_h - 28))
