"""
map_events.py — 데이터 드리븐 맵 이벤트 디스패처 (eval 제거)
"""

from engine.map_loader import MapEvent


class EventDispatcher:
    """맵 이벤트 action 문자열을 씬 핸들러에 연결합니다."""

    def __init__(self, scene):
        self.scene = scene
        self._handlers = {
            "log": self._handle_log,
            "teleport": self._handle_teleport,
            "dialogue": self._handle_dialogue,
            "next_room": self._handle_next_room,
            "set_flag": self._handle_set_flag,
            "legacy_lambda": self._handle_legacy_lambda,
        }

    def dispatch(self, event: MapEvent) -> bool:
        handler = self._handlers.get(event.action)
        if not handler:
            self.scene.log_message(f"알 수 없는 이벤트: {event.action}")
            return False
        return handler(event.args)

    def _handle_log(self, args: dict) -> bool:
        text = args.get("text", "")
        if text:
            self.scene.log_message(text)
        return True

    def _handle_teleport(self, args: dict) -> bool:
        x = int(args.get("x", 0))
        y = int(args.get("y", 0))
        self.scene.teleport_player(x, y)
        return True

    def _handle_dialogue(self, args: dict) -> bool:
        story_id = args.get("story_id", "")
        if not story_id:
            self.scene.log_message("대화 ID가 없습니다.")
            return False
        self.scene.start_dialogue(story_id)
        return True

    def _handle_next_room(self, args: dict) -> bool:
        target = args.get("target", "story")
        self.scene.advance_room(target)
        return True

    def _handle_set_flag(self, args: dict) -> bool:
        key = args.get("key", "")
        if not key:
            return False
        value = args.get("value", True)
        self.scene.game.state.set_flag(key, value)
        self.scene.log_message(f"플래그 설정: {key} = {value}")
        return True

    def _handle_legacy_lambda(self, args: dict) -> bool:
        code = args.get("code", "")
        if not code:
            return False
        try:
            func = eval(code)
            func(self.scene)
            return True
        except Exception as e:
            self.scene.log_message(f"레거시 람다 오류: {e}")
            return False
