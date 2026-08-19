import os
import math
import pygame
from settings import (
    TILE_SIZE, COLOR_DESK_WOOD, COLOR_DESK_GRAIN, COLOR_WALL,
    COLOR_WHITE, COLOR_BLACK, COLOR_YELLOW, COLOR_PINK, COLOR_GOLD,
    COLOR_RED, COLOR_BLUE, COLOR_PURPLE, COLOR_ORANGE, SPRITES_DIR
)

class AssetManager:
    """
    통합 에셋 관리자:
    1. 실제 PNG 이미지 파일이 존재하면 로드 및 캐싱
    2. 파일이 없으면 명세에 맞는 절차적(Procedural) 픽셀 서피스를 자동 생성하여 폴백
    """
    _instance = None

    def __init__(self):
        self.image_cache = {}
        self.font_cache = {}

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_image(self, rel_path, target_size=None):
        if rel_path in self.image_cache:
            return self.image_cache[rel_path]

        full_path = os.path.join(SPRITES_DIR, rel_path)
        if os.path.exists(full_path):
            try:
                img = pygame.image.load(full_path).convert_alpha()
                if target_size:
                    img = pygame.transform.scale(img, target_size)
                self.image_cache[rel_path] = img
                return img
            except Exception as e:
                print(f"[AssetManager] 이미지 로드 실패 ({full_path}): {e}")

        # 캐시에 없으면 절차적 생성
        surf = self._generate_procedural_sprite(rel_path, target_size or (TILE_SIZE, TILE_SIZE))
        self.image_cache[rel_path] = surf
        return surf

    def get_font(self, size):
        if size not in self.font_cache:
            # 기본 시스템 폰트
            try:
                self.font_cache[size] = pygame.font.SysFont("AppleGothic,NanumGothic,malgungothic,sans-serif", size)
            except Exception:
                self.font_cache[size] = pygame.font.Font(None, size)
        return self.font_cache[size]

    def _generate_procedural_sprite(self, key, size):
        """기획 명세 기반 절차적 픽셀 스프라이트 생성"""
        w, h = size
        surf = pygame.Surface((w, h), pygame.SRCALPHA)

        # 1. 주인공 (연필캡 캐릭터)
        if "player" in key:
            self._draw_player_procedural(surf, w, h)
        # 2. 낡은 연필
        elif "monster_pencil" in key:
            self._draw_monster_pencil_procedural(surf, w, h)
        # 3. 샤프심
        elif "monster_lead" in key:
            self._draw_monster_lead_procedural(surf, w, h)
        # 4. 녹슨 용수철
        elif "monster_spring" in key:
            self._draw_monster_spring_procedural(surf, w, h)
        # 5. 얼룩진 핑크 형광펜
        elif "monster_highlighter" in key:
            self._draw_monster_highlighter_procedural(surf, w, h)
        # 6. 지우개
        elif "monster_eraser" in key:
            self._draw_monster_eraser_procedural(surf, w, h)
        # 7. 보스 (필통)
        elif "boss" in key:
            self._draw_boss_procedural(surf, w, h)
        # 8. 연필깎이 (스폰 지점)
        elif "sharpener" in key:
            self._draw_sharpener_procedural(surf, w, h)
        # 9. 타일류
        elif "tile_wall" in key:
            surf.fill(COLOR_WALL)
            pygame.draw.rect(surf, (45, 30, 22), (0, 0, w, h), 2)
            pygame.draw.line(surf, (95, 68, 52), (2, 2), (w-2, 2), 2)
        elif "tile_wood" in key:
            surf.fill(COLOR_DESK_WOOD)
            # 나무 결 표현
            for y_off in range(6, h, 12):
                pygame.draw.line(surf, COLOR_DESK_GRAIN, (0, y_off), (w, y_off), 2)
            pygame.draw.rect(surf, (140, 100, 65), (0, 0, w, h), 1)
        elif "ruler_weapon" in key:
            self._draw_ruler_blade_procedural(surf, w, h)
        else:
            # 기본 대체 컬러 박스
            surf.fill((120, 120, 140, 200))
            pygame.draw.rect(surf, COLOR_WHITE, (0, 0, w, h), 1)

        return surf

    def _draw_player_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 연필 캡 몸통 (연한 베이지/핑크빛 캡)
        body_rect = pygame.Rect(cx - 10, cy - 8, 20, 22)
        pygame.draw.rect(surf, (240, 220, 200), body_rect, border_radius=6)
        pygame.draw.rect(surf, COLOR_BLACK, body_rect, 2, border_radius=6)

        # 몸통 대각선 2줄 무늬
        pygame.draw.line(surf, (180, 50, 50), (cx - 7, cy + 8), (cx + 5, cy - 4), 2)
        pygame.draw.line(surf, (180, 50, 50), (cx - 4, cy + 12), (cx + 8, cy), 2)

        # 머리 (검은 머리)
        head_rect = pygame.Rect(cx - 9, cy - 18, 18, 14)
        pygame.draw.ellipse(surf, (30, 30, 30), head_rect)

        # 흰 피부 얼굴
        face_rect = pygame.Rect(cx - 7, cy - 14, 14, 10)
        pygame.draw.ellipse(surf, (255, 255, 255), face_rect)

        # 눈 코 입
        pygame.draw.circle(surf, COLOR_BLACK, (cx - 3, cy - 10), 1) # 좌 눈
        pygame.draw.circle(surf, COLOR_BLACK, (cx + 3, cy - 10), 1) # 우 눈
        pygame.draw.circle(surf, (220, 100, 100), (cx, cy - 8), 1)  # 코
        pygame.draw.line(surf, COLOR_BLACK, (cx - 2, cy - 6), (cx + 2, cy - 6), 1) # 입

        # Wii 스타일 둥근 공중 손 (Floating hands)
        pygame.draw.circle(surf, COLOR_WHITE, (cx - 14, cy + 3), 4)
        pygame.draw.circle(surf, COLOR_BLACK, (cx - 14, cy + 3), 4, 1)
        pygame.draw.circle(surf, COLOR_WHITE, (cx + 14, cy + 3), 4)
        pygame.draw.circle(surf, COLOR_BLACK, (cx + 14, cy + 3), 4, 1)

    def _draw_ruler_blade_procedural(self, surf, w, h):
        # 4개 자를 이은 블레이드 + 끝에 삼각자
        cx, cy = w // 2, h // 2
        # 자 4개 검신 (반투명 아크릴 눈금자)
        blade_rect = pygame.Rect(cx - 3, 6, 6, h - 14)
        pygame.draw.rect(surf, (200, 240, 255, 220), blade_rect)
        pygame.draw.rect(surf, (80, 150, 220), blade_rect, 1)
        # 눈금선 4개 마디
        for y_tick in range(10, h - 14, 6):
            pygame.draw.line(surf, (40, 90, 180), (cx - 2, y_tick), (cx + 2, y_tick), 1)

        # 검 끝 삼각자 (Triangle Ruler Tip)
        triangle_points = [(cx, 2), (cx - 8, 14), (cx + 8, 14)]
        pygame.draw.polygon(surf, (255, 230, 100, 230), triangle_points)
        pygame.draw.polygon(surf, (200, 140, 20), triangle_points, 1)

        # 손잡이 가드 (자 연결부)
        guard_rect = pygame.Rect(cx - 7, h - 12, 14, 4)
        pygame.draw.rect(surf, (150, 150, 160), guard_rect)

    def _draw_monster_pencil_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 낡은 노란 연필: 벗겨진 노란 코팅, 뭉툭한 흑연
        pencil_rect = pygame.Rect(cx - 6, cy - 12, 12, 24)
        pygame.draw.rect(surf, (230, 180, 40), pencil_rect, border_radius=2)
        # 낡아서 벗겨진 흠집
        pygame.draw.line(surf, (180, 120, 20), (cx - 4, cy - 4), (cx + 3, cy - 2), 2)
        pygame.draw.line(surf, (180, 120, 20), (cx - 2, cy + 4), (cx + 4, cy + 6), 2)
        # 뭉툭한 흑연 심
        pygame.draw.polygon(surf, (120, 100, 80), [(cx - 6, cy - 12), (cx + 6, cy - 12), (cx, cy - 20)])
        pygame.draw.circle(surf, (40, 40, 40), (cx, cy - 20), 3) # 뭉툭한 흑연 끝
        # 성난 눈
        pygame.draw.line(surf, COLOR_RED, (cx - 4, cy), (cx - 1, cy + 2), 2)
        pygame.draw.line(surf, COLOR_RED, (cx + 4, cy), (cx + 1, cy + 2), 2)

    def _draw_monster_lead_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 날카로운 샤프심 (매우 가늘고 짙은 흑연 바디 + 붉은 안광)
        lead_rect = pygame.Rect(cx - 2, cy - 16, 4, 32)
        pygame.draw.rect(surf, (50, 50, 55), lead_rect)
        pygame.draw.line(surf, (90, 90, 100), (cx - 1, cy - 16), (cx - 1, cy + 16), 1)
        # 뾰족한 끝
        pygame.draw.polygon(surf, (30, 30, 30), [(cx - 3, cy - 16), (cx + 3, cy - 16), (cx, cy - 22)])
        # 안광
        pygame.draw.circle(surf, COLOR_RED, (cx, cy - 4), 2)

    def _draw_monster_spring_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 녹슨 용수철 (적갈색 코일 스프링)
        for i in range(5):
            y_pos = cy - 14 + i * 6
            coil_rect = pygame.Rect(cx - 8, y_pos, 16, 6)
            pygame.draw.ellipse(surf, (160, 80, 45), coil_rect, 2)
            # 녹 얼룩
            if i % 2 == 0:
                pygame.draw.circle(surf, (110, 45, 20), (cx - 4 + i * 2, y_pos + 2), 2)
        # 눈
        pygame.draw.circle(surf, COLOR_YELLOW, (cx - 3, cy - 6), 2)
        pygame.draw.circle(surf, COLOR_YELLOW, (cx + 3, cy - 6), 2)

    def _draw_monster_highlighter_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 얼룩진 핑크 형광펜 (두꺼운 직사각형 바디 + 사선 핑크 닙)
        body = pygame.Rect(cx - 8, cy - 10, 16, 24)
        pygame.draw.rect(surf, (255, 105, 180), body, border_radius=3)
        pygame.draw.rect(surf, (200, 50, 130), body, 2, border_radius=3)
        # 얼룩진 잉크 자국
        pygame.draw.circle(surf, (180, 30, 100), (cx - 3, cy + 2), 4)
        # 사각 형광 닙
        pygame.draw.polygon(surf, (255, 20, 147), [(cx - 6, cy - 10), (cx + 6, cy - 10), (cx + 4, cy - 18), (cx - 2, cy - 18)])
        # 광기 어린 눈
        pygame.draw.circle(surf, COLOR_WHITE, (cx - 3, cy - 4), 3)
        pygame.draw.circle(surf, COLOR_BLACK, (cx - 3, cy - 4), 1)
        pygame.draw.circle(surf, COLOR_WHITE, (cx + 3, cy - 4), 3)
        pygame.draw.circle(surf, COLOR_BLACK, (cx + 3, cy - 4), 1)

    def _draw_monster_eraser_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 지우개: 흰색/하늘색 지우개 껍질 + 고무 덩치
        rubber = pygame.Rect(cx - 12, cy - 14, 24, 28)
        pygame.draw.rect(surf, (245, 245, 250), rubber, border_radius=4)
        # 파란 슬리브 껍질
        sleeve = pygame.Rect(cx - 12, cy - 2, 24, 16)
        pygame.draw.rect(surf, (60, 120, 220), sleeve, border_radius=2)
        pygame.draw.rect(surf, (30, 70, 150), sleeve, 1, border_radius=2)
        # 지우개 때/닳은 모서리
        pygame.draw.line(surf, (180, 180, 190), (cx - 10, cy - 12), (cx + 8, cy - 12), 2)
        # 무거운 눈매
        pygame.draw.line(surf, COLOR_BLACK, (cx - 6, cy - 8), (cx - 2, cy - 6), 2)
        pygame.draw.line(surf, COLOR_BLACK, (cx + 6, cy - 8), (cx + 2, cy - 6), 2)

    def _draw_boss_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 필통 보스: 거친 황갈색 가죽 외형 + 중앙 검은 천 입 (지퍼)
        body = pygame.Rect(cx - 28, cy - 24, 56, 48)
        pygame.draw.rect(surf, (140, 90, 45), body, border_radius=8)
        pygame.draw.rect(surf, (90, 50, 25), body, 3, border_radius=8)

        # 거친 가죽 스티치 질감
        for x_off in range(cx - 24, cx + 25, 8):
            pygame.draw.line(surf, (190, 140, 90), (x_off, cy - 22), (x_off + 4, cy - 22), 2)
            pygame.draw.line(surf, (190, 140, 90), (x_off, cy + 22), (x_off + 4, cy + 22), 2)

        # 중앙 개방된 입 / 블랙 패브릭 차원문
        mouth = pygame.Rect(cx - 20, cy - 10, 40, 20)
        pygame.draw.ellipse(surf, (10, 10, 15), mouth)
        pygame.draw.ellipse(surf, (180, 70, 230), mouth, 2) # 포탈 기운 보라색 림

        # 보스 눈 (지퍼 슬라이더 눈)
        pygame.draw.circle(surf, COLOR_GOLD, (cx - 12, cy - 14), 5)
        pygame.draw.circle(surf, COLOR_RED, (cx - 12, cy - 14), 2)
        pygame.draw.circle(surf, COLOR_GOLD, (cx + 12, cy - 14), 5)
        pygame.draw.circle(surf, COLOR_RED, (cx + 12, cy - 14), 2)

    def _draw_sharpener_procedural(self, surf, w, h):
        cx, cy = w // 2, h // 2
        # 연필깎이 스폰 포인트 오브젝트
        base = pygame.Rect(cx - 14, cy - 14, 28, 28)
        pygame.draw.rect(surf, (70, 150, 230), base, border_radius=6)
        pygame.draw.rect(surf, (30, 90, 170), base, 2, border_radius=6)
        # 연필 투입구 홀
        pygame.draw.circle(surf, (20, 20, 30), (cx, cy), 8)
        pygame.draw.circle(surf, (200, 200, 210), (cx, cy), 8, 2)
        # 칼날 나사 디테일
        pygame.draw.line(surf, (220, 220, 230), (cx - 4, cy - 8), (cx + 8, cy + 4), 2)
