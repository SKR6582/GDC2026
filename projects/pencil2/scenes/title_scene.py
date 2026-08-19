import pygame
from settings import (
    SCREEN_WIDTH, SCREEN_HEIGHT, COLOR_GOLD, COLOR_WHITE,
    COLOR_YELLOW, COLOR_BLACK, TITLE_FONT_SIZE, UI_FONT_SIZE
)
from engine.scene_manager import Scene
from engine.asset_manager import AssetManager

class TitleScene(Scene):
    """메인 타이틀 화면 및 맵 선택 메뉴"""
    def __init__(self, game):
        super().__init__(game)
        self.options = ["새 게임 시작 (New Game)", "방 선택 (Select Room)", "게임 종료 (Exit)"]
        self.selected_idx = 0
        self.mode = "main" # 'main' or 'select_room'
        self.room_idx = 0

    def handle_input(self, input_mgr):
        move = input_mgr.get_menu_nav_vector()
        
        if self.mode == "main":
            if move == (0, -1): # 위
                self.selected_idx = (self.selected_idx - 1) % len(self.options)
            elif move == (0, 1): # 아래
                self.selected_idx = (self.selected_idx + 1) % len(self.options)


            if input_mgr.interact_pressed or input_mgr.attack_pressed:
                if self.selected_idx == 0:
                    # 새 게임 시작
                    self.game.state.reset_for_new_game()
                    self.game.go_to_room("room_1")
                elif self.selected_idx == 1:
                    self.mode = "select_room"
                    self.game.refresh_rooms()
                    self.room_idx = 0
                elif self.selected_idx == 2:
                    pygame.event.post(pygame.event.Event(pygame.QUIT))

        elif self.mode == "select_room":
            rooms = self.game.available_rooms
            if not rooms:
                if input_mgr.cancel_pressed or input_mgr.interact_pressed:
                    self.mode = "main"
                return

            if move == (0, -1):
                self.room_idx = (self.room_idx - 1) % len(rooms)
            elif move == (0, 1):
                self.room_idx = (self.room_idx + 1) % len(rooms)

            if input_mgr.interact_pressed or input_mgr.attack_pressed:
                selected_room = rooms[self.room_idx]
                self.game.go_to_room(selected_room)
            elif input_mgr.cancel_pressed:
                self.mode = "main"

    def update(self, dt):
        pass

    def draw(self, screen):
        screen.fill((20, 15, 12)) # 짙은 우드 톤

        title_font = AssetManager.get().get_font(TITLE_FONT_SIZE)
        menu_font = AssetManager.get().get_font(UI_FONT_SIZE + 4)
        sub_font = AssetManager.get().get_font(UI_FONT_SIZE)

        # 1. 타이틀 로고
        t1 = title_font.render("PENCIL 2", True, COLOR_GOLD)
        t2 = sub_font.render("— The Desk Adventure —", True, (200, 180, 140))
        
        screen.blit(t1, ((SCREEN_WIDTH - t1.get_width()) // 2, 120))
        screen.blit(t2, ((SCREEN_WIDTH - t2.get_width()) // 2, 180))

        # 2. 메뉴 옵션
        if self.mode == "main":
            for i, opt in enumerate(self.options):
                is_cur = (i == self.selected_idx)
                color = COLOR_YELLOW if is_cur else (170, 170, 180)
                prefix = "▶ " if is_cur else "   "
                txt = menu_font.render(f"{prefix}{opt}", True, color)
                screen.blit(txt, ((SCREEN_WIDTH - txt.get_width()) // 2, 280 + i * 48))
        else:
            header = menu_font.render("【 방 선택 (방향키 선택 / SPACE 확인 / ESC 뒤로) 】", True, COLOR_GOLD)
            screen.blit(header, ((SCREEN_WIDTH - header.get_width()) // 2, 260))

            rooms = self.game.available_rooms
            for i, r_name in enumerate(rooms):
                is_cur = (i == self.room_idx)
                color = COLOR_YELLOW if is_cur else (170, 170, 180)
                prefix = "▶ " if is_cur else "   "
                txt = sub_font.render(f"{prefix}{r_name}", True, color)
                screen.blit(txt, ((SCREEN_WIDTH - txt.get_width()) // 2, 310 + i * 36))

        # 3. 바닥 조작 안내
        foot_txt = sub_font.render("[WASD/방향키] 이동  [SPACE/J] 선택", True, (130, 130, 140))
        screen.blit(foot_txt, ((SCREEN_WIDTH - foot_txt.get_width()) // 2, SCREEN_HEIGHT - 40))
