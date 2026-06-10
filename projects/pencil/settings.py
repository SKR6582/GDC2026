"""
settings.py — 책상 위 필기구 전쟁 세계관
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")
FONTS_DIR = os.path.join(ASSETS_DIR, "fonts")

WINDOW_WIDTH = 1280
WINDOW_HEIGHT = 720
FPS = 120
TITLE = "Pencil Wars — 책상 위의 전쟁"

class Colors:
    BLACK       = (10,  10,  15)
    WHITE       = (245, 245, 250)
    RED         = (200, 40,  40)
    GREEN       = (100, 180, 100)
    BLUE        = (38,  139, 210)
    YELLOW      = (255, 220, 80)
    CYAN        = (42,  161, 152)
    DARK_BG     = (100, 75,  50)
    MID_GRAY    = (88,  88,  100)
    LIGHT_GRAY  = (200, 200, 210)

TILE_SIZE = 48

THEMES = {
    "DESK_WOOD":  {"bg": (160, 120, 80), "name": "나무 책상",    "accent": (200, 160, 100)},
    "DESK_WHITE": {"bg": (220, 215, 210), "name": "하얀 책상",   "accent": (180, 180, 190)},
    "DESK_DARK":  {"bg": (60,  50,  45), "name": "어두운 서재",  "accent": (120, 90,  60)},
}

def get_theme_by_room(room_num):
    if room_num <= 3: return THEMES["DESK_WOOD"]
    if room_num <= 6: return THEMES["DESK_WHITE"]
    return THEMES["DESK_DARK"]

class Layers:
    BACKGROUND = 0
    TILES      = 1
    ENTITIES   = 2
    UI         = 5
