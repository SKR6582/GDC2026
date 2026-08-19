import sys
import pygame
from settings import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, TITLE
from engine.input_manager import InputManager
from engine.game_manager import GameManager
from scenes.title_scene import TitleScene

def main():
    pygame.init()
    pygame.font.init()
    
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption(TITLE)
    clock = pygame.time.Clock()
    
    input_mgr = InputManager()
    game = GameManager()
    
    # 타이틀 씬으로 시작
    game.scene_manager.change(TitleScene(game))
    
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0 # 초 단위 델타 타임
        
        # 1. 이벤트 처리
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            else:
                input_mgr.handle_event(event)

        # 2. 업데이트
        input_mgr.update(dt)
        game.scene_manager.handle_input(input_mgr)
        game.scene_manager.update(dt)
        
        # 3. 렌더링
        game.scene_manager.draw(screen)
        pygame.display.flip()
        
        # 일회성 입력 플래그 클리어
        input_mgr.clear_frame_triggers()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
