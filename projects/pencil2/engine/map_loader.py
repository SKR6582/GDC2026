import os
import json
from settings import MAPS_DIR, TILE_SIZE

class MapData:
    def __init__(self, room_id, folder_path, json_data):
        self.room_id = room_id
        self.folder_path = folder_path
        self.name = json_data.get("name", f"Room {room_id}")
        self.width = json_data.get("width", 20)
        self.height = json_data.get("height", 14)
        self.tile_size = json_data.get("tile_size", TILE_SIZE)
        
        # 레이어 데이터 (2차원 리스트 width x height)
        self.tiles = json_data.get("tiles", [[0]*self.width for _ in range(self.height)])
        
        # 배경 이미지 (폴더 내 background.png 존재 시 우선)
        bg_file = json_data.get("background_image", "background.png")
        full_bg_path = os.path.join(folder_path, bg_file)
        self.background_path = full_bg_path if os.path.exists(full_bg_path) else None
        
        # 엔티티 및 스폰
        self.player_spawn = json_data.get("player_spawn", {"x": 2, "y": 2})
        self.monsters = json_data.get("monsters", [])
        self.portals = json_data.get("portals", [])
        self.interacts = json_data.get("interacts", [])
        self.puzzles = json_data.get("puzzles", [])
        self.gates = json_data.get("gates", [])
        self.boss_gate_rule = json_data.get("boss_gate_rule", None) # 몬스터 전멸 시 아이템 드롭 및 포탈 오픈

        # 진입 스토리 파일 경로
        story_file = json_data.get("story", "story.json")
        full_story_path = os.path.join(folder_path, story_file)
        self.story_path = full_story_path if os.path.exists(full_story_path) else None

    def is_wall(self, tx, ty):
        if tx < 0 or tx >= self.width or ty < 0 or ty >= self.height:
            return True
        tile = self.tiles[ty][tx]
        return tile == 1 or tile == 5 # 벽(1) 또는 잠긴 문(5)


class MapLoader:
    """맵 폴더 자동 탐색 및 로더"""
    @staticmethod
    def get_available_rooms():
        """assets/maps/ 디렉토리 내의 유효한 룸 목록 자동 탐색"""
        if not os.path.exists(MAPS_DIR):
            os.makedirs(MAPS_DIR, exist_ok=True)
            
        rooms = []
        for entry in sorted(os.listdir(MAPS_DIR)):
            folder = os.path.join(MAPS_DIR, entry)
            if os.path.isdir(folder):
                map_json = os.path.join(folder, "map.json")
                if os.path.exists(map_json):
                    rooms.append(entry)
        return rooms

    @staticmethod
    def load_room(room_folder_name):
        """지정된 폴더명(예: room_1)에서 맵 데이터 로드"""
        folder_path = os.path.join(MAPS_DIR, room_folder_name)
        map_json_path = os.path.join(folder_path, "map.json")
        
        if not os.path.exists(map_json_path):
            raise FileNotFoundError(f"맵 데이터를 찾을 수 없습니다: {map_json_path}")
            
        with open(map_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        return MapData(room_folder_name, folder_path, data)
