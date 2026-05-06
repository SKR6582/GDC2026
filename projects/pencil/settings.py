"""
settings.py — 최적화된 고화질 해상도(1280x720) 적용
"""

import os

# ── 경로 ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")

# ── 윈도우 (선명도와 퍼포먼스 균형을 위해 1280x720으로 최적화) ──
WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 720
FPS = 60
TITLE = "Pencil Engine - High Quality Mode"

# ── 색상 팔레트 (좀 더 풍부한 색감으로 조정) ───────────
class Colors:
    BLACK       = (10,  10,  15)
    WHITE       = (245, 245, 250)
    RED         = (220, 50,  47)
    GREEN       = (133, 153, 0)
    BLUE        = (38,  139, 210)
    YELLOW      = (181, 137, 0)
    CYAN        = (42,  161, 152)
    DARK_BG     = (15,  15,  20)
    MID_GRAY    = (88,  88,  100)
    LIGHT_GRAY  = (200, 200, 210)

# ── 타일 및 물리 설정 ────────────────────────────────
TILE_SIZE = 64 # 고해상도 시각화를 위해 타일 크기를 64로 상향

# ── 테마 설정 ────────────────────────────────────────
THEMES = {
    "FOREST":  {"bg": (25, 35, 25), "name": "에메랄드 숲", "accent": (100, 180, 100)},
    "CAVE":    {"bg": (20, 20, 30), "name": "심연의 동굴", "accent": (80, 120, 200)},
    "VOLCANO": {"bg": (35, 15, 15), "name": "화염의 땅", "accent": (220, 80, 50)}
}

def get_theme_by_room(room_num):
    if room_num <= 3: return THEMES["FOREST"]
    if room_num <= 6: return THEMES["CAVE"]
    return THEMES["VOLCANO"]

class Layers:
    BACKGROUND = 0
    TILES      = 1
    ENTITIES   = 2
    UI         = 5
