import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, COLOR_WHITE, COLOR_GOLD,
    COLOR_YELLOW, COLOR_BLUE, COLOR_GREEN, COLOR_RED, COLOR_BLACK
)
from engine.scene_manager import Scene
from engine.asset_manager import AssetManager

class GeometricPuzzleScene(Scene):
    """
    자/삼각자 학용품 도형 퍼즐 오버레이 씬
    - 문제: 삼각자/자의 각도/길이 기하학 및 모양 맞추기
    - 풀이 완료 시 콜백 호출 및 게이트 해금
    """
    def __init__(self, game, puzzle_data, on_solve=None):
        super().__init__(game)
        self.puzzle_data = puzzle_data
        self.on_solve = on_solve
        
        self.question = puzzle_data.get("question", "삼각자의 남은 한 각은 몇 도일까요? (90°, 60°, ?°)")
        self.options = puzzle_data.get("options", ["30°", "45°", "60°", "90°"])
        self.correct_index = puzzle_data.get("correct_index", 0)
        self.selected_idx = 0
        
        self.is_answered = False
        self.is_correct = False
        self.feedback_timer = 0.0

    def handle_input(self, input_mgr):
        if self.is_answered:
            # 피드백 화면에서 아무 키나 누르면 즉시 씬 닫기
            if input_mgr.interact_pressed or input_mgr.attack_pressed:
                if self.is_correct:
                    if self.on_solve:
                        self.on_solve()
                    self.game.scene_manager.pop()
                else:
                    self.is_answered = False
            return

        move = input_mgr.get_menu_nav_vector()
        if move == (0, -1) or move == (-1, 0): # 위/왼쪽
            self.selected_idx = (self.selected_idx - 1) % len(self.options)
        elif move == (0, 1) or move == (1, 0): # 아래/오른쪽
            self.selected_idx = (self.selected_idx + 1) % len(self.options)


        if input_mgr.interact_pressed or input_mgr.attack_pressed:
            self.is_answered = True
            self.is_correct = (self.selected_idx == self.correct_index)
            self.feedback_timer = 1.0

    def update(self, dt):
        if self.is_answered:
            self.feedback_timer -= dt
            if self.feedback_timer <= 0:
                if self.is_correct:
                    if self.on_solve:
                        self.on_solve()
                    self.game.scene_manager.pop()
                else:
                    # 오답인 경우 다시 기회 부여
                    self.is_answered = False

    def draw(self, screen):
        # 반투명 배경
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((15, 20, 30, 220))
        screen.blit(overlay, (0, 0))

        font = AssetManager.get().get_font(24)
        title_font = AssetManager.get().get_font(30)

        # 메인 퍼즐 보드
        board_w = 640
        board_h = 420
        bx = (SCREEN_WIDTH - board_w) // 2
        by = (SCREEN_HEIGHT - board_h) // 2

        pygame.draw.rect(screen, (35, 40, 55), (bx, by, board_w, board_h), border_radius=12)
        pygame.draw.rect(screen, COLOR_GOLD, (bx, by, board_w, board_h), 3, border_radius=12)

        # 타이틀 & 삼각자 일러스트
        t_surf = title_font.render("【 학용품 기하학 퍼즐 】", True, COLOR_GOLD)
        screen.blit(t_surf, ((SCREEN_WIDTH - t_surf.get_width()) // 2, by + 20))

        # 삼각자 도면 그래픽
        tri_x = SCREEN_WIDTH // 2
        tri_y = by + 120
        pts = [(tri_x - 70, tri_y + 40), (tri_x + 70, tri_y + 40), (tri_x - 70, tri_y - 50)]
        pygame.draw.polygon(screen, (70, 140, 230), pts, 3)
        pygame.draw.circle(screen, COLOR_YELLOW, (tri_x - 50, tri_y + 25), 4) # 90도 표기

        # 문제 텍스트
        q_surf = font.render(self.question, True, COLOR_WHITE)
        screen.blit(q_surf, ((SCREEN_WIDTH - q_surf.get_width()) // 2, by + 190))

        # 선택지 버튼들
        for i, opt in enumerate(self.options):
            btn_w = 260
            btn_h = 42
            col = i % 2
            row = i // 2
            btn_x = bx + 45 + col * (btn_w + 30)
            btn_y = by + 240 + row * (btn_h + 15)

            is_cur = (i == self.selected_idx)
            btn_bg = (60, 80, 120) if is_cur else (45, 50, 70)
            border_col = COLOR_YELLOW if is_cur else (100, 110, 130)

            pygame.draw.rect(screen, btn_bg, (btn_x, btn_y, btn_w, btn_h), border_radius=6)
            pygame.draw.rect(screen, border_col, (btn_x, btn_y, btn_w, btn_h), 2 if is_cur else 1, border_radius=6)

            opt_surf = font.render(f"{i+1}. {opt}", True, COLOR_YELLOW if is_cur else COLOR_WHITE)
            screen.blit(opt_surf, (btn_x + (btn_w - opt_surf.get_width()) // 2, btn_y + (btn_h - opt_surf.get_height()) // 2))

        # 정답/오답 피드백 팝업
        if self.is_answered:
            fb_text = "★ 정답입니다! 게이트가 열립니다! ★" if self.is_correct else "틀렸습니다! 다시 시도하세요."
            fb_col = COLOR_GREEN if self.is_correct else COLOR_RED
            fb_surf = title_font.render(fb_text, True, fb_col)
            screen.blit(fb_surf, ((SCREEN_WIDTH - fb_surf.get_width()) // 2, by + board_h - 45))
