"""
game.py — Pencil Engine 메인 게임 클래스.
초기화, 메인 루프, 씬 매니저 통합.
"""

import pygame
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, FPS, TITLE
from engine.input_manager import InputManager
from engine.asset_loader import AssetLoader
from engine.scene import SceneManager
from engine.camera import Camera


class Game:
    """
    사용법:
        game = Game()
        game.scene_manager.change(TitleScene(game))
        game.run()
    """

    def __init__(self):
        pygame.init()
        pygame.mixer.init()
        pygame.font.init()

        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption(TITLE)

        self.clock = pygame.time.Clock()
        self.running = True
        self.dt = 0.0  # 델타타임 (초)

        # 핵심 시스템
        self.input = InputManager()
        self.assets = AssetLoader()
        self.scene_manager = SceneManager()
        self.camera = Camera()

    def run(self):
        """메인 게임 루프."""
        while self.running:
            # 델타타임 계산 (초 단위)
            self.dt = self.clock.tick(FPS) / 1000.0

            # 입력 갱신
            self.input.update()

            if self.input.quit_requested:
                self.running = False
                break

            # ESC → 종료 (전역 단축키)
            if self.input.key_pressed(pygame.K_ESCAPE):
                self.running = False
                break

            # 현재 씬 업데이트
            self.scene_manager.handle_input(self.input)
            self.scene_manager.update(self.dt)

            # 카메라 업데이트
            self.camera.update(self.dt)

            # 그리기
            self.scene_manager.draw(self.screen)
            pygame.display.flip()

        self.quit()

    def quit(self):
        pygame.mixer.quit()
        pygame.font.quit()
        pygame.quit()
