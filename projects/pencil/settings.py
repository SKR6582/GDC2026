"""
settings.py — 전역 설정 상수
"""

import os

# ── 경로 ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")

# ── 윈도우 ────────────────────────────────────────────
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
FPS = 60
TITLE = "Pencil Engine - Room Adventure"

# ── 색상 팔레트 (R, G, B, [A]) ────────────────────────
class Colors:
    BLACK       = (0,   0,   0)
    WHITE       = (255, 255, 255)
    RED         = (220, 50,  47)
    GREEN       = (133, 153, 0)
    BLUE        = (38,  139, 210)
    YELLOW      = (181, 137, 0)
    CYAN        = (42,  161, 152)
    MAGENTA     = (211, 54,  130)
    ORANGE      = (203, 75,  22)
    DARK_BG     = (18,  18,  24)
    MID_GRAY    = (88,  88,  100)
    LIGHT_GRAY  = (200, 200, 210)
    TRANSPARENT = (0,   0,   0,  0)

# ── 테마 설정 (방 번호에 따라 변경) ────────────────────
THEMES = {
    "FOREST":  {"bg": (20, 40, 20), "name": "숲속 평원", "accent": (133, 153, 0)},
    "CAVE":    {"bg": (25, 25, 30), "name": "어두운 동굴", "accent": (38, 139, 210)},
    "VOLCANO": {"bg": (40, 15, 15), "name": "용암 지대", "accent": (203, 75, 22)}
}

def get_theme_by_room(room_num):
    if room_num <= 3: return THEMES["FOREST"]
    if room_num <= 6: return THEMES["CAVE"]
    return THEMES["VOLCANO"]

# ── 물리 및 레이어 ────────────────────────────────────
GRAVITY = 800
FRICTION = 0.85
TILE_SIZE = 32

class Layers:
    BACKGROUND = 0
    TILES      = 1
    ENTITIES   = 2
    PLAYER     = 3
    PARTICLES  = 4
    UI         = 5
