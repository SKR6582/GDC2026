import os
import pygame
from settings import PLAYER_MAX_HP, MAPS_DIR
from engine.scene_manager import SceneManager
from engine.map_loader import MapLoader

class GameState:
    def __init__(self):
        self.player_hp = PLAYER_MAX_HP
        self.player_max_hp = PLAYER_MAX_HP
        self.inventory = [] # 획득한 아이템 키 목록 (예: 'boss_key', 'ruler_piece')
        self.flags = {}     # 게임 진행 플래그
        self.solved_puzzles = set()
        self.current_room_id = "room_1"

    def has_item(self, item_id):
        return item_id in self.inventory

    def add_item(self, item_id):
        if item_id not in self.inventory:
            self.inventory.append(item_id)

    def remove_item(self, item_id):
        if item_id in self.inventory:
            self.inventory.remove(item_id)

    def set_flag(self, key, value=True):
        self.flags[key] = value

    def get_flag(self, key, default=False):
        return self.flags.get(key, default)

    def reset_for_new_game(self):
        self.player_hp = self.player_max_hp
        self.inventory.clear()
        self.flags.clear()
        self.solved_puzzles.clear()
        self.current_room_id = "room_1"


class GameManager:
    """전역 게임 매니저: 씬 관리, 상태 유지, 룸 전환"""
    def __init__(self):
        self.state = GameState()
        self.scene_manager = SceneManager(self)
        self.available_rooms = MapLoader.get_available_rooms()

    def refresh_rooms(self):
        self.available_rooms = MapLoader.get_available_rooms()

    def go_to_room(self, room_id, spawn_override=None):
        from scenes.exploration_scene import ExplorationScene
        from scenes.story_scene import StoryScene
        
        self.state.current_room_id = room_id
        map_data = MapLoader.load_room(room_id)
        
        # 진입 스토리가 있고 아직 보지 않은 경우 스토리 씬 먼저 재생
        story_flag = f"saw_story_{room_id}"
        if map_data.story_path and not self.state.get_flag(story_flag):
            self.state.set_flag(story_flag, True)
            
            def after_story():
                self.scene_manager.change(ExplorationScene(self, map_data, spawn_override))
                
            self.scene_manager.change(StoryScene(self, map_data.story_path, on_finish=after_story))
        else:
            self.scene_manager.change(ExplorationScene(self, map_data, spawn_override))
