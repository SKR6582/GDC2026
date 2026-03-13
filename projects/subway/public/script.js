import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Configuration & Constants ---
const MENU = {
    breads: ['화이트', '하티', '파마산 오레가노', '위트', '허니 오트', '플랫브레드'],
    meats: ['치킨 데리야끼', '로스트 치킨', '로티세리 바비큐 치킨', '이탈리안 비엠티', '비엘티', '미트볼', '참치', '햄', '에그마요', '폴드포크 바비큐', '스테이크 & 치즈', '스파이시 이탈리안'],
    cheeses: ['아메리칸 치즈', '슈레드 치즈', '모짜렐라 치즈'],
    veggies: ['양상추', '토마토', '오이', '피망', '양파', '피클', '올리브', '할라피뇨'],
    sauces: ['랜치', '마요네즈', '스위트 어니언', '허니 머스타드', '스위트 칠리', '핫 칠리', '사우스웨스트 치폴레', '머스타드', '홀스래디쉬', '올리브 오일', '레드와인 식초', '소금', '후추'],
    cookies: ['더블 초코칩', '초코칩', '오트밀 레이즌', '라즈베리 치즈케익', '화이트 초코 마카다미아'],
    drinks: ['코카콜라', '코가콜라 제로', '스프라이트', '닥터페퍼', '생수']
};

const COLORS = {
    subwayGreen: 0x008938,
    subwayYellow: 0xffc20d,
    floor: 0xcccccc,
    wall: 0xeeeeee,
    counter: 0x2c3e50,
    bread: 0xe67e22,
    meat: 0x8d6e63,
    cheese: 0xf1c40f,
    veggie: 0x27ae60,
    sauce: 0xecf0f1
};

// --- Game State ---
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let currentCustomer = null;
let currentSandwich = { bread: null, is_toasted: false, meat: null, cheese: null, veggies: [], sauces: [], cookie: null, drink: null };
let revenue = 0;
let interactiveObjects = [];
let npc = null;

// --- Initialization ---
function init() {
    // 1. Three.js Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    scene.fog = new THREE.Fog(0x87ceeb, 0, 500);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Eyes height

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);

    // 3. Environment
    createEnvironment();

    // 4. Controls
    controls = new PointerLockControls(camera, document.body);
    
    document.getElementById('start-btn').addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        document.getElementById('overlay-screen').classList.add('hidden');
    });

    controls.addEventListener('unlock', () => {
        document.getElementById('overlay-screen').classList.remove('hidden');
    });

    setupKeyboardControls();

    // 5. Interaction
    window.addEventListener('click', onPlayerInteract);
    window.addEventListener('resize', onWindowResize);

    // 6. HUD Buttons
    document.getElementById('submit-btn').onclick = submitOrder;
    document.getElementById('close-result-btn').onclick = () => {
        document.getElementById('result-overlay').classList.add('hidden');
        resetSandwich();
        fetchCustomer();
    };

    // 7. Start Game Loop
    animate();
    
    // Initial customer fetch
    setTimeout(fetchCustomer, 2000);
}

// --- Environment Construction ---
function createEnvironment() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshLambertMaterial({ color: COLORS.floor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Walls
    createWall(0, 5, -15, 30, 10, 1); // Front
    createWall(-15, 5, 0, 1, 10, 30); // Left
    createWall(15, 5, 0, 1, 10, 30); // Right

    // Counter (The Prep Station)
    const counterGeo = new THREE.BoxGeometry(10, 1, 2);
    const counterMat = new THREE.MeshLambertMaterial({ color: COLORS.counter });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(0, 0.5, -5);
    scene.add(counter);

    // Counter Top (Glass area)
    const glassGeo = new THREE.BoxGeometry(10, 0.5, 2);
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.4 });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.25, -5);
    scene.add(glass);

    // Interaction Trays on the counter
    spawnInteractionTrays();
    
    // NPC Spot
    npc = createBox(0, 1, -10, 0.8, 2, 0.8, 0x3498db); // Simple human block
    scene.add(npc);
}

function createWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.wall });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    scene.add(wall);
}

function createBox(x, y, z, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

function spawnInteractionTrays() {
    // Bread Bin
    createTray(-4, 1.05, -5, "bread", "White", COLORS.bread);
    // Oven (Toaster)
    createTray(-2.5, 1.05, -5, "toast", "Toasting", 0x333333);
    // Meat Trays
    createTray(-1, 1.05, -5, "meat", "B.M.T", COLORS.meat);
    // Cheese Bins
    createTray(1, 1.05, -5, "cheese", "American", COLORS.cheese);
    // Veggie Bins (Multi-select)
    createTray(3, 1.05, -5, "veggies", "Veggies", COLORS.veggie);
    // Sauce Bins
    createTray(4.5, 1.05, -5, "sauces", "Sauces", COLORS.sauce);
}

function createTray(x, y, z, type, value, color) {
    const tray = createBox(x, y, z, 1.2, 0.15, 1, color);
    tray.userData = { type, value };
    interactiveObjects.push(tray);
    scene.add(tray);
}

// --- Interaction Logic ---
function onPlayerInteract() {
    if (!controls.isLocked) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const { type, value } = obj.userData;
        handleIngredientSelection(type, value);
    }
}

function handleIngredientSelection(type, value) {
    // Realistic workflow: cycling through menu items on click for now
    if (type === 'bread') {
        const currentIdx = MENU.breads.indexOf(currentSandwich.bread || "");
        currentSandwich.bread = MENU.breads[(currentIdx + 1) % MENU.breads.length];
    } else if (type === 'toast') {
        currentSandwich.is_toasted = !currentSandwich.is_toasted;
    } else if (type === 'meat') {
        const currentIdx = MENU.meats.indexOf(currentSandwich.meat || "");
        currentSandwich.meat = MENU.meats[(currentIdx + 1) % MENU.meats.length];
    } else if (type === 'cheese') {
        const currentIdx = MENU.cheeses.indexOf(currentSandwich.cheese || "");
        currentSandwich.cheese = MENU.cheeses[(currentIdx + 1) % MENU.cheeses.length];
    } else if (type === 'veggies') {
        // Toggle all for simplicity in 3D demo
        currentSandwich.veggies = currentSandwich.veggies.length > 0 ? [] : [...MENU.veggies];
    } else if (type === 'sauces') {
        currentSandwich.sauces = currentSandwich.sauces.length > 0 ? [] : ['랜치', '스위트 칠리'];
    }

    updateHUD();
}

function updateHUD() {
    const s = currentSandwich;
    let text = s.bread ? `🍞 빵: ${s.bread}${s.is_toasted ? '(구움)' : ''}<br>` : '빵을 먼저 선택하세요.<br>';
    if (s.meat) text += `🥩 고기: ${s.meat}<br>`;
    if (s.cheese) text += `🧀 치즈: ${s.cheese}<br>`;
    if (s.veggies.length > 0) text += `🥗 야채: ${s.veggies.length}종류<br>`;
    if (s.sauces.length > 0) text += `🍯 소스: ${s.sauces.join(', ')}<br>`;

    document.getElementById('tray-list').innerHTML = text;
    document.getElementById('submit-btn').disabled = !s.bread || !s.meat || !s.cheese;
}

// --- API Integration ---
async function fetchCustomer() {
    document.getElementById('customer-name').innerText = "손님 기다리는 중...";
    try {
        const res = await fetch('/api/customer/generate', { method: 'POST' });
        const data = await res.json();
        currentCustomer = data;

        document.getElementById('chat-overlay').classList.remove('hidden');
        document.getElementById('customer-name').innerText = data.name;
        document.getElementById('customer-dialogue').innerText = `"${data.dialogue}"`;
        
        // NPC Pop animation
        npc.scale.set(1, 1, 1);
        npc.material.color.setHex(0x3498db);
    } catch (err) {
        console.error(err);
    }
}

async function submitOrder() {
    if (!currentCustomer) return;
    
    // Auto-fill random cookie/drink if NPC asked for them (for demo ease)
    currentSandwich.cookie = currentCustomer.exact_order.cookie;
    currentSandwich.drink = currentCustomer.exact_order.drink;

    try {
        const res = await fetch('/api/customer/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerData: currentCustomer, playerSandwich: currentSandwich })
        });
        const data = await res.json();

        showResult(data);
        revenue += Math.floor(data.score * 100);
        document.getElementById('revenue').innerText = `${revenue.toLocaleString()}원`;
    } catch (err) {
        console.error(err);
    } finally {
        currentCustomer = null;
        document.getElementById('chat-overlay').classList.add('hidden');
    }
}

function showResult(data) {
    document.getElementById('final-score').innerText = data.score;
    document.getElementById('evaluation-feedback').innerText = `"${data.feedback}"`;
    document.getElementById('result-overlay').classList.remove('hidden');
    controls.unlock();
}

function resetSandwich() {
    currentSandwich = { bread: null, is_toasted: false, meat: null, cheese: null, veggies: [], sauces: [], cookie: null, drink: null };
    updateHUD();
}

// --- Engine Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        prevTime = time;
    }

    renderer.render(scene, camera);
}

let prevTime = performance.now();

function setupKeyboardControls() {
    const onKeyDown = (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = true; break;
            case 'Enter': if (currentCustomer && !document.getElementById('submit-btn').disabled) submitOrder(); break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': moveRight = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
