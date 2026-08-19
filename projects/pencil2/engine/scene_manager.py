class Scene:
    """모든 게임 씬의 기본 추상 클래스"""
    def __init__(self, game):
        self.game = game

    def on_enter(self):
        pass

    def on_exit(self):
        pass

    def handle_input(self, input_mgr):
        pass

    def update(self, dt):
        pass

    def draw(self, screen):
        pass


class SceneManager:
    """스택 기반 씬 관리자 (씬 교체, 오버레이 푸시/팝 지원)"""
    def __init__(self, game):
        self.game = game
        self.stack = []

    @property
    def current(self):
        return self.stack[-1] if self.stack else None

    def change(self, next_scene):
        """현재 씬 전체를 새 씬으로 교체"""
        while self.stack:
            old = self.stack.pop()
            old.on_exit()
        self.stack.append(next_scene)
        next_scene.on_enter()

    def push(self, overlay_scene):
        """현재 씬 위에 새 씬(대화, 일시정지, 퍼즐 등)을 얹음"""
        self.stack.append(overlay_scene)
        overlay_scene.on_enter()

    def pop(self):
        """오버레이 씬 종료 및 이전 씬 복귀"""
        if self.stack:
            top = self.stack.pop()
            top.on_exit()

    def handle_input(self, input_mgr):
        if self.current:
            self.current.handle_input(input_mgr)

    def update(self, dt):
        if self.current:
            self.current.update(dt)

    def draw(self, screen):
        # 스택의 모든 씬을 순서대로 그릴 수 있도록 (오버레이 씬 투명도 렌더링)
        for scene in self.stack:
            scene.draw(screen)
