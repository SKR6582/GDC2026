"""
asset_loader.py — 이미지, 사운드, 폰트를 캐싱하여 로드.
같은 경로를 두 번 로드해도 디스크 I/O가 한 번만 일어난다.
"""

import os
import pygame
from settings import IMAGES_DIR, SOUNDS_DIR, FONTS_DIR


class AssetLoader:
    """싱글톤 패턴 없이, Game이 하나만 만들어 Scene에 전달하는 구조."""

    def __init__(self):
        self._images: dict[str, pygame.Surface] = {}
        self._sounds: dict[str, pygame.mixer.Sound] = {}
        self._fonts: dict[tuple[str | None, int], pygame.font.Font] = {}

    # ── 이미지 ────────────────────────────────────────
    def load_image(
        self,
        filename: str,
        alpha: bool = True,
        scale: tuple[int, int] | None = None,
    ) -> pygame.Surface:
        """
        assets/images/ 아래의 파일을 로드하고 캐싱한다.
        alpha=True 이면 convert_alpha(), 아니면 convert().
        scale 을 주면 해당 크기로 스케일링한다.
        """
        cache_key = f"{filename}_{alpha}_{scale}"
        if cache_key in self._images:
            return self._images[cache_key]

        path = os.path.join(IMAGES_DIR, filename)
        if not os.path.exists(path):
            # 파일이 없으면 placeholder Surface 반환
            surf = pygame.Surface((32, 32))
            surf.fill((255, 0, 255))  # 눈에 띄는 마젠타
            self._images[cache_key] = surf
            return surf

        img = pygame.image.load(path)
        img = img.convert_alpha() if alpha else img.convert()

        if scale is not None:
            img = pygame.transform.scale(img, scale)

        self._images[cache_key] = img
        return img

    def make_colored_surface(
        self,
        width: int,
        height: int,
        color: tuple,
        alpha: bool = False,
    ) -> pygame.Surface:
        """단색 Surface를 즉석 생성한다. 프로토타이핑에 유용."""
        flags = pygame.SRCALPHA if alpha else 0
        surf = pygame.Surface((width, height), flags)
        surf.fill(color)
        return surf

    # ── 사운드 ────────────────────────────────────────
    def load_sound(self, filename: str, volume: float = 1.0) -> pygame.mixer.Sound:
        """assets/sounds/ 아래 파일을 로드하고 캐싱한다."""
        if filename in self._sounds:
            return self._sounds[filename]

        path = os.path.join(SOUNDS_DIR, filename)
        if not os.path.exists(path):
            # 빈 사운드 반환 (크래시 방지)
            snd = pygame.mixer.Sound(buffer=b'\x00' * 44)
            self._sounds[filename] = snd
            return snd

        snd = pygame.mixer.Sound(path)
        snd.set_volume(volume)
        self._sounds[filename] = snd
        return snd

    # ── 폰트 ──────────────────────────────────────────
    def load_font(self, filename: str | None, size: int) -> pygame.font.Font:
        """
        filename이 None이면 pygame 기본 폰트를 사용한다.
        그렇지 않으면 assets/fonts/ 에서 TTF를 로드한다.
        """
        key = (filename, size)
        if key in self._fonts:
            return self._fonts[key]

        if filename is None:
            font = pygame.font.Font(None, size)
        else:
            path = os.path.join(FONTS_DIR, filename)
            if os.path.exists(path):
                font = pygame.font.Font(path, size)
            else:
                font = pygame.font.Font(None, size)

        self._fonts[key] = font
        return font
