"""
map_loader.py — 맵 JSON 로드, 검증, 레거시 lambda 마이그레이션
"""

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Optional, Union, Tuple

from settings import ASSETS_DIR, THEMES

MAPS_DIR = os.path.join(ASSETS_DIR, "data", "maps")
ROOMS_MANIFEST = os.path.join(ASSETS_DIR, "data", "rooms.json")
MAP_VERSION = 1


@dataclass
class MapEvent:
    trigger: str
    action: str
    args: dict = field(default_factory=dict)


@dataclass
class MapCell:
    type: int = 0
    event: Optional[MapEvent] = None
    lambda_code: Optional[str] = None


@dataclass
class MapData:
    version: int
    room_id: int
    theme: str
    bg_image: Optional[str]
    spawn: Tuple[int, int]
    grid_w: int
    grid_h: int
    grid: list[list[MapCell]]

    def cell_at(self, x: int, y: int) -> Optional[MapCell]:
        if 0 <= x < self.grid_w and 0 <= y < self.grid_h:
            return self.grid[y][x]
        return None

    def is_wall(self, x: int, y: int) -> bool:
        cell = self.cell_at(x, y)
        return cell is None or cell.type == 1


def _default_trigger(cell_type: int) -> str:
    return "step" if cell_type == 4 else "interact"


def _migrate_lambda(lambda_str: str, cell_type: int) -> Optional[MapEvent]:
    if not lambda_str or lambda_str == "None":
        return None

    teleport = re.search(r"teleport_player\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)", lambda_str)
    if teleport:
        return MapEvent(
            trigger=_default_trigger(cell_type),
            action="teleport",
            args={"x": int(teleport.group(1)), "y": int(teleport.group(2))},
        )

    log_msg = re.search(r"log_message\s*\(\s*['\"](.+?)['\"]\s*\)", lambda_str)
    if log_msg:
        return MapEvent(
            trigger=_default_trigger(cell_type),
            action="log",
            args={"text": log_msg.group(1)},
        )

    return MapEvent(
        trigger=_default_trigger(cell_type),
        action="legacy_lambda",
        args={"code": lambda_str},
    )


def _normalize_cell(raw: dict, cell_type: Optional[int] = None) -> MapCell:
    ctype = raw.get("type", cell_type if cell_type is not None else 0)

    if raw.get("event") and raw["event"].get("action") not in (None, "none"):
        ev = raw["event"]
        return MapCell(
            type=ctype,
            event=MapEvent(
                trigger=ev.get("trigger", _default_trigger(ctype)),
                action=ev["action"],
                args=dict(ev.get("args") or {}),
            ),
        )

    lambda_str = raw.get("lambda")
    if lambda_str and lambda_str != "None":
        migrated = _migrate_lambda(lambda_str, ctype)
        if migrated:
            return MapCell(type=ctype, event=migrated)

    return MapCell(type=ctype)


def _normalize_grid(grid: list, fallback_room_id: int) -> tuple[list[list[MapCell]], int, int]:
    grid_h = len(grid)
    grid_w = len(grid[0]) if grid_h > 0 else 0
    normalized: list[list[MapCell]] = []

    for y in range(grid_h):
        row_len = len(grid[y]) if y < grid_h else 0
        row: list[MapCell] = []
        for x in range(grid_w):
            raw = grid[y][x] if x < row_len else {"type": 0}
            row.append(_normalize_cell(raw))
        normalized.append(row)

    return normalized, grid_w, grid_h


def _find_spawn(grid: list, grid_w: int, grid_h: int, spawn_raw: Optional[dict]) -> Tuple[int, int]:
    if spawn_raw:
        return int(spawn_raw.get("x", 0)), int(spawn_raw.get("y", 0))

    for y in range(grid_h):
        for x in range(grid_w):
            if grid[y][x].type == 0:
                return x, y
    return 0, 0


def normalize_map_data(raw: Union[dict, list], fallback_room_id: int = 1) -> MapData:
    if isinstance(raw, list):
        grid_raw = raw
        meta = {
            "version": MAP_VERSION,
            "room_id": fallback_room_id,
            "theme": "DESK_WOOD",
            "bg_image": None,
            "spawn": None,
        }
    elif isinstance(raw, dict) and "grid" in raw:
        grid_raw = raw["grid"]
        bg = raw.get("bg_image")
        meta = {
            "version": raw.get("version", MAP_VERSION),
            "room_id": raw.get("room_id", fallback_room_id),
            "theme": raw.get("theme", "DESK_WOOD"),
            "bg_image": None if not bg or bg == "None" else bg,
            "spawn": raw.get("spawn"),
        }
    else:
        return create_default_map(fallback_room_id)

    grid, grid_w, grid_h = _normalize_grid(grid_raw, fallback_room_id)
    theme = meta["theme"] if meta["theme"] in THEMES else "DESK_WOOD"
    spawn = _find_spawn(grid, grid_w, grid_h, meta["spawn"])

    return MapData(
        version=meta["version"],
        room_id=meta["room_id"],
        theme=theme,
        bg_image=meta["bg_image"],
        spawn=spawn,
        grid_w=grid_w,
        grid_h=grid_h,
        grid=grid,
    )


def create_default_map(room_id: int = 1, width: int = 60, height: int = 20) -> MapData:
    grid: list[list[MapCell]] = [
        [MapCell(type=0) for _ in range(width)] for _ in range(height)
    ]

    for x in range(width):
        grid[0][x] = MapCell(type=1)
        grid[height - 1][x] = MapCell(type=1)
    for y in range(height):
        grid[y][0] = MapCell(type=1)
        grid[y][width - 1] = MapCell(type=1)

    spawn_x, spawn_y = 2, height // 2
    grid[spawn_y][spawn_x] = MapCell(type=0)
    grid[5][10] = MapCell(
        type=3,
        event=MapEvent("interact", "log", {"text": "보물 상자를 열었습니다!"}),
    )
    grid[height - 2][width - 3] = MapCell(
        type=4,
        event=MapEvent("step", "next_room", {"target": "story"}),
    )

    return MapData(
        version=MAP_VERSION,
        room_id=room_id,
        theme="DESK_WOOD",
        bg_image=None,
        spawn=(spawn_x, spawn_y),
        grid_w=width,
        grid_h=height,
        grid=grid,
    )


def load_rooms_manifest() -> list[dict]:
    if not os.path.exists(ROOMS_MANIFEST):
        return []
    with open(ROOMS_MANIFEST, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("rooms", [])


def get_room_entry(room_id: int) -> Optional[dict]:
    for entry in load_rooms_manifest():
        if entry.get("id") == room_id:
            return entry
    return None


def map_path_for_room(room_id: int) -> str:
    entry = get_room_entry(room_id)
    filename = entry["map"] if entry else f"room_{room_id}.json"
    return os.path.join(MAPS_DIR, filename)


def load_map(room_id: int) -> MapData:
    path = map_path_for_room(room_id)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        return normalize_map_data(raw, room_id)

    legacy = os.path.join(ASSETS_DIR, "data", "test_map.json")
    if room_id == 1 and os.path.exists(legacy):
        with open(legacy, "r", encoding="utf-8") as f:
            raw = json.load(f)
        return normalize_map_data(raw, room_id)

    return create_default_map(room_id)


def validate_map(map_data: MapData) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if map_data.grid_h == 0 or map_data.grid_w == 0:
        errors.append("그리드가 비어 있습니다.")
        return errors, warnings

    for y in range(map_data.grid_h):
        if len(map_data.grid[y]) != map_data.grid_w:
            errors.append(f"행 {y}의 열 수가 다릅니다.")

    sx, sy = map_data.spawn
    if not (0 <= sx < map_data.grid_w and 0 <= sy < map_data.grid_h):
        errors.append(f"스폰 좌표 ({sx}, {sy})가 맵 범위를 벗어났습니다.")
    elif map_data.grid[sy][sx].type == 1:
        warnings.append(f"스폰 좌표 ({sx}, {sy})가 벽 위에 있습니다.")

    for y in range(map_data.grid_h):
        for x in range(map_data.grid_w):
            cell = map_data.grid[y][x]
            if cell.type < 0 or cell.type > 4:
                errors.append(f"({x}, {y}) 타일 타입이 유효하지 않습니다: {cell.type}")

            has_event = cell.event is not None or (cell.lambda_code and cell.lambda_code != "None")
            if cell.type in (3, 4) and not has_event:
                warnings.append(f"({x}, {y}) 타일에 이벤트가 없습니다.")

            if cell.event and cell.event.action == "teleport":
                tx = cell.event.args.get("x")
                ty = cell.event.args.get("y")
                if tx is None or ty is None or not (0 <= tx < map_data.grid_w and 0 <= ty < map_data.grid_h):
                    errors.append(f"({x}, {y}) 텔레포트 목표가 맵 범위를 벗어났습니다.")

    return errors, warnings
