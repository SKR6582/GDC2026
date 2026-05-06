"""
game_manager.py — 게임의 전역 상태(방 번호, 진행도) 관리.
모든 씬에서 이 객체를 통해 현재 진행 상황을 공유합니다.
"""

from settings import get_theme_by_room

class GameManager:
    def __init__(self):
        self.current_room = 1
        self.max_rooms = 10
        self.score = 0
        self.player_hp = 100
        
    def next_room(self):
        self.current_room += 1
        return self.current_room
    
    def get_current_theme(self):
        return get_theme_by_room(self.current_room)
    
    def is_event_room(self):
        """특정 방에서 스토리나 미니게임을 발생시킬지 결정"""
        # 예: 3번 방은 미니게임, 5번 방은 스토리
        if self.current_room == 3: return "minigame"
        if self.current_room == 5: return "story"
        return "battle"

    def reset(self):
        self.current_room = 1
        self.score = 0
        self.player_hp = 100
