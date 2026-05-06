"""
battle_scene.py — 책상 위 필기구 전쟁 (World-Class Edition)
배경: 나무결 책상 + 노트 종이
플레이어: 연필 | 적: 빨간펜, 샤프
"""
import pygame, random, math
from engine.scene import Scene
from settings import WINDOW_WIDTH, WINDOW_HEIGHT, Colors, TILE_SIZE

# ── 파티클 시스템 ────────────────────────────────────
class Particle:
    def __init__(self, x, y, color, vel=None, life=0.5, size=4):
        self.pos = pygame.math.Vector2(x, y)
        self.vel = vel or pygame.math.Vector2(random.uniform(-80,80), random.uniform(-80,80))
        self.life = life
        self.max_life = life
        self.size = size
        self.color = color

    def update(self, dt):
        self.pos += self.vel * dt
        self.vel *= 0.95
        self.life -= dt

    def draw(self, screen, cam):
        if self.life <= 0: return
        alpha = max(0, self.life / self.max_life)
        r = max(1, int(self.size * alpha))
        sp = cam.apply_pos((self.pos.x, self.pos.y))
        pygame.draw.circle(screen, self.color, sp, r)

# ── 데미지 숫자 팝업 ─────────────────────────────────
class DmgPopup:
    def __init__(self, x, y, text, color=(255,255,100)):
        self.pos = pygame.math.Vector2(x, y)
        self.text = text
        self.color = color
        self.life = 0.8
        self.vel_y = -60

    def update(self, dt):
        self.pos.y += self.vel_y * dt
        self.life -= dt

    def draw(self, screen, cam, font):
        if self.life <= 0: return
        a = max(0, self.life / 0.8)
        sp = cam.apply_pos((self.pos.x, self.pos.y))
        s = font.render(self.text, True, self.color)
        screen.blit(s, (sp[0] - s.get_width()//2, sp[1]))

# ── 플레이어 (연필) ──────────────────────────────────
class Player:
    def __init__(self, gx, gy):
        self.grid_x, self.grid_y = gx, gy
        self.logic_pos = pygame.math.Vector2(gx*TILE_SIZE, gy*TILE_SIZE)
        self.target_pos = pygame.math.Vector2(self.logic_pos)
        self.is_moving = False
        self.move_speed = 380
        self.input_stack = []
        self.facing = pygame.math.Vector2(1, 0)
        self.max_hp, self.hp = 100, 100
        self.inv_timer = 0.0
        self.atk_timer = 0.0
        self.is_attacking = False
        self.rect = pygame.Rect(0,0,28,56)
        self.trail = []  # 이동 잔상

    def handle_input(self, inp, walls):
        keys = {pygame.K_a:(-1,0), pygame.K_d:(1,0), pygame.K_w:(0,-1), pygame.K_s:(0,1)}
        for k in keys:
            if inp.key_pressed(k):
                if k not in self.input_stack: self.input_stack.append(k)
            if inp.key_released(k):
                if k in self.input_stack: self.input_stack.remove(k)
        # 스택이 바뀌면 즉시 시점(facing) 갱신 — 이동 중이든 아니든
        if self.input_stack:
            lk = self.input_stack[-1]
            self.facing = pygame.math.Vector2(keys[lk])
        if not self.is_moving and self.input_stack:
            mv = self.facing
            nx, ny = self.grid_x+int(mv.x), self.grid_y+int(mv.y)
            if (nx,ny) not in walls:
                self.grid_x, self.grid_y = nx, ny
                self.target_pos = pygame.math.Vector2(nx*TILE_SIZE, ny*TILE_SIZE)
                self.is_moving = True
        if (inp.mouse_button_pressed(0) or inp.key_pressed(pygame.K_p)) and not self.is_attacking:
            self.is_attacking = True
            self.atk_timer = 0.15

    def take_damage(self, amt):
        if self.inv_timer > 0: return False
        self.hp = max(0, self.hp - amt)
        self.inv_timer = 1.2
        return True

    def update(self, dt, inp, walls):
        if self.inv_timer > 0: self.inv_timer -= dt
        if self.atk_timer > 0: self.atk_timer -= dt
        else: self.is_attacking = False
        if self.is_moving:
            d = self.target_pos - self.logic_pos
            dist = d.length()
            if dist > 0:
                amt = self.move_speed * dt
                if amt >= dist:
                    self.logic_pos = pygame.math.Vector2(self.target_pos)
                    self.is_moving = False
                    keys = {pygame.K_a:(-1,0), pygame.K_d:(1,0), pygame.K_w:(0,-1), pygame.K_s:(0,1)}
                    if self.input_stack:
                        lk = self.input_stack[-1]
                        mv = pygame.math.Vector2(keys[lk])
                        nx, ny = self.grid_x+int(mv.x), self.grid_y+int(mv.y)
                        if (nx,ny) not in walls:
                            self.grid_x, self.grid_y = nx, ny
                            self.target_pos = pygame.math.Vector2(nx*TILE_SIZE, ny*TILE_SIZE)
                            self.is_moving = True
                else:
                    self.logic_pos += d.normalize() * amt
            self.trail.append(pygame.math.Vector2(self.logic_pos))
            if len(self.trail) > 6: self.trail.pop(0)
        cx, cy = self.logic_pos.x+TILE_SIZE//2, self.logic_pos.y+TILE_SIZE//2
        self.rect.centerx, self.rect.bottom = cx, cy+12

    def draw(self, screen, cam):
        if self.inv_timer > 0 and int(pygame.time.get_ticks()/80)%2==0: return
        # 잔상
        for i, tp in enumerate(self.trail):
            a = int(40*(i/max(len(self.trail),1)))
            r = pygame.Rect(0,0,20,40)
            r.centerx, r.bottom = tp.x+TILE_SIZE//2, tp.y+TILE_SIZE//2+12
            dr = cam.apply(r)
            s = pygame.Surface((dr.w, dr.h), pygame.SRCALPHA)
            pygame.draw.rect(s, (255,220,80,a), (0,0,dr.w,dr.h), border_radius=4)
            screen.blit(s, dr.topleft)
        dr = cam.apply(self.rect)
        # 연필 본체 (노란색 육각 바디)
        pygame.draw.rect(screen, (255,220,80), dr, border_radius=6)
        # 연필심 (바라보는 방향)
        tip_x = dr.centerx + self.facing.x*14
        tip_y = dr.centery + self.facing.y*14
        pygame.draw.circle(screen, (60,60,60), (int(tip_x), int(tip_y)), 5)
        # 지우개 (반대쪽)
        er_x = dr.centerx - self.facing.x*12
        er_y = dr.centery - self.facing.y*12
        pygame.draw.circle(screen, (255,150,170), (int(er_x), int(er_y)), 6)
        # 테두리
        pygame.draw.rect(screen, (180,160,60), dr, 2, border_radius=6)
        # 공격 이펙트
        if self.is_attacking:
            ax = self.rect.centerx + self.facing.x*TILE_SIZE
            ay = self.rect.centery + self.facing.y*TILE_SIZE
            sp = cam.apply_pos((ax, ay))
            pygame.draw.circle(screen, (255,255,255), sp, 20, 3)
            pygame.draw.circle(screen, (255,240,200), sp, 14, 2)

# ── 적 (빨간펜/샤프) ─────────────────────────────────
class Enemy:
    def __init__(self, gx, gy, etype="redpen"):
        self.grid_x, self.grid_y = gx, gy
        self.logic_pos = pygame.math.Vector2(gx*TILE_SIZE, gy*TILE_SIZE)
        self.target_pos = pygame.math.Vector2(self.logic_pos)
        self.is_moving = False
        self.type = etype
        self.move_speed = 160 if etype=="redpen" else 300
        self.move_delay = 0.55 if etype=="redpen" else 0.3
        self.move_timer = random.uniform(0, self.move_delay)
        self.hp = 3 if etype=="redpen" else 1
        self.dmg = 25 if etype=="redpen" else 15
        self.rect = pygame.Rect(0,0,30,56)
        self.alive = True

    def update(self, dt, pg, walls):
        if not self.alive: return
        if not self.is_moving:
            self.move_timer += dt
            if self.move_timer >= self.move_delay:
                self.move_timer = 0
                self._ai(pg, walls)
        if self.is_moving:
            d = self.target_pos - self.logic_pos
            dist = d.length()
            if dist > 0:
                a = self.move_speed * dt
                if a >= dist:
                    self.logic_pos = pygame.math.Vector2(self.target_pos)
                    self.is_moving = False
                else:
                    self.logic_pos += d.normalize() * a
        self.rect.centerx = self.logic_pos.x+TILE_SIZE//2
        self.rect.bottom = self.logic_pos.y+TILE_SIZE//2+12

    def _ai(self, pg, walls):
        dx = 1 if pg[0]>self.grid_x else -1 if pg[0]<self.grid_x else 0
        dy = 1 if pg[1]>self.grid_y else -1 if pg[1]<self.grid_y else 0
        tries = []
        if dx!=0: tries.append((dx,0))
        if dy!=0: tries.append((0,dy))
        random.shuffle(tries)
        for rx,ry in [(0,1),(0,-1),(1,0),(-1,0)]:
            if (rx,ry) not in tries: tries.append((rx,ry))
        for tx,ty in tries:
            nx, ny = self.grid_x+tx, self.grid_y+ty
            if (nx,ny) not in walls:
                self.grid_x, self.grid_y = nx, ny
                self.target_pos = pygame.math.Vector2(nx*TILE_SIZE, ny*TILE_SIZE)
                self.is_moving = True
                break

    def draw(self, screen, cam):
        if not self.alive: return
        dr = cam.apply(self.rect)
        if self.type == "redpen":
            pygame.draw.rect(screen, (200,40,40), dr, border_radius=5)
            pygame.draw.rect(screen, (255,80,80), (dr.x+4, dr.y+4, dr.w-8, 8), border_radius=3)
            pygame.draw.rect(screen, (160,30,30), dr, 2, border_radius=5)
        else:  # 샤프
            pygame.draw.rect(screen, (180,180,190), dr, border_radius=3)
            pygame.draw.rect(screen, (100,100,110), (dr.x+dr.w//2-2, dr.y, 4, dr.h), border_radius=2)
            pygame.draw.rect(screen, (140,140,150), dr, 2, border_radius=3)

# ── 메인 씬 ──────────────────────────────────────────
class BattleScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.gw, self.gh = 60, 20
        self.theme = self.game.state.get_current_theme()
        self.player = Player(3, self.gh//2)
        self.walls = set()
        self.enemies = []
        self.particles = []
        self.popups = []
        self.shake = 0.0
        self.kills = 0
        self._gen_map()
        self.font = self.game.assets.load_font(None, 22)
        self.font_big = self.game.assets.load_font(None, 28)
        self.game.camera.set_world_size(self.gw*TILE_SIZE, self.gh*TILE_SIZE)
        # 나무결 텍스처 생성 (한 번만)
        self._desk_surf = self._make_desk_texture()

    def _make_desk_texture(self):
        """프로시저럴 나무결 책상 텍스처"""
        w, h = self.gw*TILE_SIZE, self.gh*TILE_SIZE
        s = pygame.Surface((w, h))
        s.fill((160, 120, 80))
        for i in range(0, h, 3):
            c = 140 + random.randint(-15, 15)
            pygame.draw.line(s, (c, c-20, c-40), (0, i), (w, i))
        # 나뭇결 매듭
        for _ in range(12):
            kx, ky = random.randint(0,w), random.randint(0,h)
            pygame.draw.ellipse(s, (130,95,60), (kx,ky,random.randint(30,80),random.randint(15,30)), 2)
        return s

    def _gen_map(self):
        self.walls.clear(); self.enemies = []
        # 테두리
        for i in range(self.gw): self.walls.add((i,-1)); self.walls.add((i,self.gh))
        for i in range(self.gh): self.walls.add((-1,i)); self.walls.add((self.gw,i))
        # 장애물 (책상 위 물건들: 책, 지우개 등)
        for _ in range(80):
            bx, by = random.randint(8, self.gw-5), random.randint(1, self.gh-2)
            for ox in range(random.randint(1,3)):
                self.walls.add((bx+ox, by))
        # 적 배치
        for _ in range(35):
            ex, ey = random.randint(12, self.gw-3), random.randint(1, self.gh-2)
            if (ex,ey) not in self.walls:
                et = "sharp" if random.random()>0.65 else "redpen"
                self.enemies.append(Enemy(ex, ey, et))

    def handle_input(self, inp):
        self.player.handle_input(inp, self.walls)

    def update(self, dt):
        self.player.update(dt, self.game.input, self.walls)
        pg = (self.player.grid_x, self.player.grid_y)

        # 공격 판정
        if self.player.is_attacking:
            ar = pygame.Rect(0,0,int(TILE_SIZE*1.5),int(TILE_SIZE*1.5))
            ar.center = (int(self.player.logic_pos.x+TILE_SIZE//2+self.player.facing.x*TILE_SIZE),
                         int(self.player.logic_pos.y+TILE_SIZE//2+self.player.facing.y*TILE_SIZE))
            for e in self.enemies:
                if not e.alive: continue
                if ar.colliderect(e.rect):
                    e.hp -= 1
                    # 연필 가루 파티클
                    for _ in range(8):
                        c = (60,60,60) if e.type=="sharp" else (200,40,40)
                        self.particles.append(Particle(e.rect.centerx, e.rect.centery, c))
                    if e.hp <= 0:
                        e.alive = False
                        self.kills += 1
                        self.shake = 0.15
                        # 잉크 튀김 파티클
                        for _ in range(15):
                            ic = (200,30,30) if e.type=="redpen" else (80,80,90)
                            self.particles.append(Particle(e.rect.centerx, e.rect.centery, ic, life=0.8, size=6))
                        self.popups.append(DmgPopup(e.rect.centerx, e.rect.y, "BREAK!", (255,100,100)))
                    else:
                        self.popups.append(DmgPopup(e.rect.centerx, e.rect.y, "-1", (255,255,100)))

        # 적 업데이트 & 충돌
        for e in self.enemies:
            if not e.alive: continue
            e.update(dt, pg, self.walls)
            if self.player.rect.colliderect(e.rect):
                if self.player.take_damage(e.dmg):
                    self.shake = 0.2
                    for _ in range(6):
                        self.particles.append(Particle(self.player.rect.centerx, self.player.rect.centery, (255,220,80)))

        if self.player.hp <= 0: self._respawn()

        # 파티클 & 팝업
        for p in self.particles: p.update(dt)
        self.particles = [p for p in self.particles if p.life > 0]
        for p in self.popups: p.update(dt)
        self.popups = [p for p in self.popups if p.life > 0]

        if self.shake > 0: self.shake -= dt

        # 카메라
        cx = self.player.logic_pos.x+TILE_SIZE//2
        cy = self.player.logic_pos.y+TILE_SIZE//2
        self.game.camera._target = type('O',(object,),{'rect':pygame.Rect(cx,cy,1,1)})()

        if self.player.grid_x >= self.gw-2: self._next_world()

    def _respawn(self):
        self.player.grid_x, self.player.grid_y = 3, self.gh//2
        self.player.logic_pos = pygame.math.Vector2(3*TILE_SIZE, (self.gh//2)*TILE_SIZE)
        self.player.target_pos = pygame.math.Vector2(self.player.logic_pos)
        self.player.hp = self.player.max_hp
        self.player.is_moving = False

    def draw(self, screen):
        # 화면 흔들림 오프셋
        sx, sy = 0, 0
        if self.shake > 0:
            sx, sy = random.randint(-4,4), random.randint(-4,4)

        # 1. 나무결 책상 배경
        dr = self.game.camera.apply(pygame.Rect(0,0,self.gw*TILE_SIZE, self.gh*TILE_SIZE))
        screen.fill((100,75,50))
        screen.blit(self._desk_surf, (dr.x+sx, dr.y+sy))

        cam = self.game.camera
        cx, cy = cam.offset.x, cam.offset.y

        # 2. 노트 종이 그리드 (줄 노트 느낌)
        for gy in range(max(0,int(cy//TILE_SIZE)-1), min(self.gh, int((cy+WINDOW_HEIGHT)//TILE_SIZE)+2)):
            for gx in range(max(0,int(cx//TILE_SIZE)-1), min(self.gw, int((cx+WINDOW_WIDTH)//TILE_SIZE)+2)):
                tr = pygame.Rect(gx*TILE_SIZE, gy*TILE_SIZE, TILE_SIZE, TILE_SIZE)
                dtr = cam.apply(tr)
                dtr.x += sx; dtr.y += sy

                if (gx,gy) in self.walls:
                    # 장애물 = 지우개/책 느낌
                    pygame.draw.rect(screen, (220,200,180), (dtr.x, dtr.y-16, dtr.w, dtr.h+16), border_radius=4)
                    pygame.draw.rect(screen, (240,220,200), (dtr.x, dtr.y-16, dtr.w, 16), border_radius=4)
                    pygame.draw.rect(screen, (180,160,140), (dtr.x, dtr.y-16, dtr.w, dtr.h+16), 1, border_radius=4)
                else:
                    # 노트 줄
                    pygame.draw.line(screen, (140,110,75), (dtr.x, dtr.bottom), (dtr.right, dtr.bottom))
                    if gx % 5 == 0:
                        pygame.draw.line(screen, (130,105,70), (dtr.x, dtr.y), (dtr.x, dtr.bottom))

        # 3. 적 그리기
        for e in self.enemies: e.draw(screen, cam)

        # 4. 플레이어 그리기
        self.player.draw(screen, cam)

        # 5. 파티클
        for p in self.particles: p.draw(screen, cam)
        for p in self.popups: p.draw(screen, cam, self.font)

        # ── UI 레이어 ─────────────────────────────────
        # HP 바
        bw, bh = 260, 24
        bx, by = 20, 20
        bg_s = pygame.Surface((bw+4, bh+4), pygame.SRCALPHA)
        pygame.draw.rect(bg_s, (0,0,0,120), (0,0,bw+4,bh+4), border_radius=12)
        screen.blit(bg_s, (bx-2, by-2))
        ratio = self.player.hp / self.player.max_hp
        gc = (100,230,100) if ratio>0.5 else (230,180,50) if ratio>0.2 else (230,60,60)
        pygame.draw.rect(screen, gc, (bx+3, by+3, int((bw-6)*ratio), bh-6), border_radius=8)
        pygame.draw.rect(screen, (255,255,255), (bx, by, bw, bh), 2, border_radius=12)
        ht = self.font.render(f"HP {int(self.player.hp)}/{self.player.max_hp}", True, (255,255,255))
        screen.blit(ht, (bx+bw+12, by+2))

        # 킬 카운트
        kt = self.font.render(f"KILLS: {self.kills}", True, (255,200,100))
        screen.blit(kt, (WINDOW_WIDTH - kt.get_width()-20, 20))

        # 룸 정보
        rt = self.font.render(f"ROOM {self.game.state.current_room} | P: Attack | WASD: Move", True, (220,220,220))
        screen.blit(rt, (20, 52))

        # 미니맵
        self._draw_minimap(screen)

    def _draw_minimap(self, screen):
        mw, mh = 160, 60
        mx, my = WINDOW_WIDTH-mw-15, WINDOW_HEIGHT-mh-15
        ms = pygame.Surface((mw, mh), pygame.SRCALPHA)
        pygame.draw.rect(ms, (0,0,0,140), (0,0,mw,mh), border_radius=6)
        sx, sy = mw/self.gw, mh/self.gh
        for wx,wy in self.walls:
            if 0<=wx<self.gw and 0<=wy<self.gh:
                pygame.draw.rect(ms, (180,160,140), (wx*sx, wy*sy, max(2,sx), max(2,sy)))
        for e in self.enemies:
            if not e.alive: continue
            c = (255,60,60) if e.type=="redpen" else (180,180,190)
            pygame.draw.rect(ms, c, (e.grid_x*sx, e.grid_y*sy, 3, 3))
        pygame.draw.rect(ms, (255,220,80), (self.player.grid_x*sx-1, self.player.grid_y*sy-1, 5, 5))
        pygame.draw.rect(ms, (255,255,255,100), (0,0,mw,mh), 1, border_radius=6)
        screen.blit(ms, (mx, my))

    def _next_world(self):
        self.game.state.next_room()
        from scenes.story_scene import StoryScene
        self.game.scene_manager.change(StoryScene(self.game))
