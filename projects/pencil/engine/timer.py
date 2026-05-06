"""
timer.py — 콜백 기반 타이머 시스템.
일정 시간 후 함수를 실행하거나, 반복 실행할 수 있다.
"""


class Timer:
    """
    사용법:
        timer = Timer(duration=2.0, callback=explode, repeat=False)
        # 매 프레임:
        timer.update(dt)
    """

    def __init__(
        self,
        duration: float,
        callback=None,
        repeat: bool = False,
        autostart: bool = True,
    ):
        self.duration = duration
        self.callback = callback
        self.repeat = repeat
        self._elapsed: float = 0.0
        self._active: bool = autostart
        self._finished: bool = False

    @property
    def active(self) -> bool:
        return self._active

    @property
    def finished(self) -> bool:
        return self._finished

    @property
    def progress(self) -> float:
        """0.0 ~ 1.0 진행률."""
        if self.duration <= 0:
            return 1.0
        return min(self._elapsed / self.duration, 1.0)

    def start(self):
        self._active = True
        self._finished = False
        self._elapsed = 0.0

    def stop(self):
        self._active = False

    def reset(self):
        self._elapsed = 0.0
        self._finished = False

    def update(self, dt: float):
        if not self._active or self._finished:
            return

        self._elapsed += dt

        if self._elapsed >= self.duration:
            if self.callback:
                self.callback()

            if self.repeat:
                self._elapsed -= self.duration  # 남은 시간 이월
            else:
                self._finished = True
                self._active = False
