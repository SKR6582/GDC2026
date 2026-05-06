"""
asset_loader.py — 한글 폰트 호환성이 개선된 에셋 로더
"""

import os
import pygame
from typing import Optional, Union, Tuple, Dict
from settings import IMAGES_DIR, SOUNDS_DIR, FONTS_DIR


class AssetLoader:
    def __init__(self):
        self._images: Dict[str, pygame.Surface] = {}
        self._sounds: Dict[str, pygame.mixer.Sound] = {}
        self._fonts: Dict[Tuple[Optional[str], int], pygame.font.Font] = {}
        
        # 한글 지원 시스템 폰트 후보군 (우선순위 순)
        self.ko_font_candidates = [
            "applesdgothicneo", "applegothic", "nanumgothic", "nanumbarungothic",
            "malgungothic", "dotum", "gulim", "arialunicodems"
        ]

    def load_image(self, filename: str, alpha: bool = True, scale: Optional[Tuple[int, int]] = None) -> pygame.Surface:
        cache_key = f"{filename}_{alpha}_{scale}"
        if cache_key in self._images: return self._images[cache_key]

        path = os.path.join(IMAGES_DIR, filename)
        if not os.path.exists(path):
            surf = pygame.Surface((32, 32))
            surf.fill((255, 0, 255))
            self._images[cache_key] = surf
            return surf

        img = pygame.image.load(path)
        img = img.convert_alpha() if alpha else img.convert()
        if scale is not None: img = pygame.transform.scale(img, scale)
        self._images[cache_key] = img
        return img

    def load_font(self, filename: Optional[str], size: int) -> pygame.font.Font:
        """
        폰트를 로드합니다. filename이 None이거나 파일이 없으면 
        한글 지원 시스템 폰트를 자동으로 찾습니다.
        """
        key = (filename, size)
        if key in self._fonts: return self._fonts[key]

        font = None
        # 1. 파일 시스템에서 직접 로드 시도
        if filename:
            path = os.path.join(FONTS_DIR, filename)
            if os.path.exists(path):
                try:
                    font = pygame.font.Font(path, size)
                except: pass

        # 2. 파일이 없거나 로드 실패 시 시스템 한글 폰트 검색
        if font is None:
            available_sys_fonts = pygame.font.get_fonts()
            for candidate in self.ko_font_candidates:
                if candidate in available_sys_fonts:
                    font = pygame.font.SysFont(candidate, size)
                    break
            
            # 3. 최후의 수단: 시스템 기본 폰트
            if font is None:
                font = pygame.font.Font(None, size)

        self._fonts[key] = font
        return font
