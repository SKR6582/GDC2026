"""
game.py — Pencil Engine 메인 게임 클래스.
"""

import pygame
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, FPS, TITLE
from engine.input_manager import InputManager
from engine.asset_loader import AssetLoader
from engine.scene import SceneManager
from engine.camera import Camera
from engine.game_manager import GameManager


class Game:
    def __init__(self):
        pygame.init()
        pygame.mixer.init()
        pygame.font.init()

        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption(TITLE)

        self.clock = pygame.time.Clock()
        self.running = True
        self.dt = 0.0

        # 핵심 시스템
        self.input = InputManager()
        self.assets = AssetLoader()
        self.scene_manager = SceneManager()
        self.camera = Camera()
        self.state = GameManager()  # 전역 게임 상태 관리자

    def run(self):
        """메인 게임 루프."""
        while self.running:
            self.dt = self.clock.tick(FPS) / 1000.0
            self.input.update()

            if self.input.quit_requested:
                self.running = False
                break

            if self.input.key_pressed(pygame.K_ESCAPE):
                self.running = False
                break

            self.scene_manager.handle_input(self.input)
            self.scene_manager.update(self.dt)
            self.camera.update(self.dt)

            self.scene_manager.draw(self.screen)
            pygame.display.flip()

        self.quit()

    def quit(self):
        pygame.mixer.quit()
        pygame.font.quit()
        pygame.quit()
