"""
main.py — Pencil Engine 진입점.
"""

from engine.game import Game
from scenes.title_scene import TitleScene


def main():
    game = Game()
    game.scene_manager.change(TitleScene(game))
    game.run()


if __name__ == "__main__":
    main()
