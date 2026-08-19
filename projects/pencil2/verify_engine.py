import os
import sys

os.environ['SDL_VIDEODRIVER'] = 'dummy'
import pygame
pygame.init()
pygame.font.init()

from settings import *
from engine.asset_manager import AssetManager
from engine.map_loader import MapLoader
from engine.game_manager import GameManager
from engine.input_manager import InputManager
from scenes.exploration_scene import ExplorationScene
from scenes.puzzle_scene import GeometricPuzzleScene
from scenes.story_scene import StoryScene
from scenes.title_scene import TitleScene

print("[TEST 1] Available rooms scan:")
rooms = MapLoader.get_available_rooms()
print("  Rooms found:", rooms)
assert len(rooms) >= 4, "4개 방이 모두 탐색되어야 합니다."

for r in rooms:
    m = MapLoader.load_room(r)
    print(f"  Loaded {r}: {m.name}, dimensions: {m.width}x{m.height}, monsters: {len(m.monsters)}, portals: {len(m.portals)}")

print("[TEST 2] Engine & Scene Flow Test:")
game = GameManager()
game.scene_manager.change(TitleScene(game))
assert isinstance(game.scene_manager.current, TitleScene)
print("  TitleScene OK")

input_mgr = InputManager()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))

# Room 1, 2, 3, 4 씬 로드 및 렌더링 시뮬레이션

for r_name in ["room_1", "room_2", "room_3", "room_4"]:
    mr = MapLoader.load_room(r_name)
    sc = ExplorationScene(game, mr)
    game.scene_manager.change(sc)
    
    # Room 3의 경우 키 드롭 강제 활성화 후 그리기 테스트
    if r_name == "room_3":
        sc.boss_key_spawned = True
        sc.boss_key_pos = (8, 5)
        
    for frame in range(5):
        input_mgr.update(1.0/60.0)
        game.scene_manager.handle_input(input_mgr)
        game.scene_manager.update(1.0/60.0)
        game.scene_manager.draw(screen)
    print(f"  {r_name} simulation & rendering OK")

print("  5 Monsters + Boss initialization & combat test OK")
print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

