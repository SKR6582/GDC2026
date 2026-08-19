import os
import pygame

# --- 화면 및 렌더링 설정 ---
SCREEN_WIDTH = 960
SCREEN_HEIGHT = 640
FPS = 60
TITLE = "Pencil 2 - Desk Adventure"

# 타일 그리드 기본 단위 (픽셀)
TILE_SIZE = 48

# --- 폰트 및 UI ---
UI_FONT_SIZE = 20
DIALOGUE_FONT_SIZE = 24
TITLE_FONT_SIZE = 44

# --- 색상 팔레트 ---
COLOR_BG = (28, 22, 18)            # 기본 어두운 나무 톤
COLOR_DESK_WOOD = (184, 137, 92)    # 책상 나무 타일
COLOR_DESK_GRAIN = (162, 118, 77)   # 나무 결
COLOR_WALL = (74, 52, 40)           # 벽 타일
COLOR_GRID_LINE = (140, 100, 65, 80)# 그리드 가이드라인
COLOR_WHITE = (245, 245, 245)
COLOR_BLACK = (20, 20, 20)
COLOR_RED = (220, 50, 50)
COLOR_RED_ALPHA = (220, 50, 50, 120)# 장판 예고색
COLOR_YELLOW = (245, 210, 60)
COLOR_BLUE = (70, 130, 230)
COLOR_GREEN = (60, 200, 100)
COLOR_PURPLE = (160, 60, 220)
COLOR_PINK = (255, 105, 180)
COLOR_ORANGE = (240, 140, 40)
COLOR_GOLD = (255, 215, 0)
COLOR_CHARGING_AURA = (120, 220, 255, 160)

# --- 경로 설정 ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
MAPS_DIR = os.path.join(ASSETS_DIR, "maps")
SPRITES_DIR = os.path.join(ASSETS_DIR, "sprites")
PUZZLES_DIR = os.path.join(ASSETS_DIR, "puzzles")

# --- 플레이어 설정 ---
PLAYER_MOVE_SPEED = 4.0             # 그리드 타일 이동 보간 속도 (타일/초)
PLAYER_MAX_HP = 100
PLAYER_BASIC_ATTACK_COOLDOWN = 0.35 # 기본 공격 후 딜레이 (초)
PLAYER_BASIC_DAMAGE = 25
PLAYER_BASIC_RANGE = 1.35           # 타일 단위 사거리
PLAYER_CHARGE_TIME = 1.0            # 스킬 차지 시간 (초)
PLAYER_SKILL_DAMAGE = 70
PLAYER_SKILL_RANGE = 2.0            # 강화 공격 사거리

# --- 타일 타입 정의 ---
TILE_WALKABLE = 0   # 길 (통행 가능)
TILE_WALL = 1       # 벽 (통행 불가)
TILE_DECOR = 2      # 장식 (통행 가능)
TILE_INTERACT = 3   # 상호작용 (Space로 활성화)
TILE_PORTAL = 4     # 포탈 (밟으면 도미노 붕괴 후 다음 룸 이동)
TILE_GATE = 5       # 잠긴 문 (퍼즐/키 해금 시 통과 가능)

# --- 키 바인딩 (다양한 키보드 레이아웃 & 한/영 환경 완벽 대응) ---
KEY_UP = [pygame.K_w, pygame.K_UP]
KEY_DOWN = [pygame.K_s, pygame.K_DOWN]
KEY_LEFT = [pygame.K_a, pygame.K_LEFT]
KEY_RIGHT = [pygame.K_d, pygame.K_RIGHT]
KEY_ATTACK = [pygame.K_j, pygame.K_z, pygame.K_f, pygame.K_RETURN]     # 기본 공격 (J, Z, F, Enter)
KEY_SKILL = [pygame.K_k, pygame.K_x, pygame.K_e, pygame.K_g, pygame.K_RSHIFT, pygame.K_LSHIFT] # 차지 스킬 (K, X, E, G, Shift)
KEY_INTERACT = [pygame.K_SPACE, pygame.K_e, pygame.K_RETURN]          # 상호작용
KEY_CANCEL = [pygame.K_ESCAPE, pygame.K_BACKSPACE]                    # 취소 / 일시정지

