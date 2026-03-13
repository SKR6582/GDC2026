/**
 * Stellar Rhythm - 3D Denpa Edition
 * Self-contained game engine with Three.js rendering and Web Audio API SE Logic.
 */

// --- SE (SOUND ENGINE) ---
class SoundEngine {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterVolume = this.ctx.createGain();
        this.baseGain = 0.5; // Base gain controlled by settings
        this.masterVolume.gain.value = this.baseGain;
        this.masterVolume.connect(this.ctx.destination);
    }
    
    setVolume(volPercent) {
        this.baseGain = volPercent / 100;
        this.masterVolume.gain.value = this.baseGain;
    }

    playTone(freq, type, duration, vol) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHit(judgment) {
        // High energy synths for different judgments
        switch(judgment) {
            case 'PERFECT':
                this.playTone(880, 'square', 0.1, 0.4); 
                setTimeout(() => this.playTone(1760, 'sine', 0.15, 0.3), 20);
                break;
            case 'GREAT':
                this.playTone(660, 'square', 0.1, 0.4);
                break;
            case 'GOOD':
                this.playTone(440, 'triangle', 0.1, 0.4);
                break;
            case 'MISS':
                // Low crunchy noise
                this.playTone(110, 'sawtooth', 0.2, 0.6);
                break;
        }
    }
}

const se = new SoundEngine();

// --- USER SETTINGS ---
// User Settings loaded from localStorage early to apply to initialization
let userSettings = {
    offset: parseInt(localStorage.getItem('sr_offset') || '0'), 
    judgZ: parseFloat(localStorage.getItem('sr_judgZ') || '6'),
    seVol: parseInt(localStorage.getItem('sr_seVol') || '50'),
    musicVol: parseInt(localStorage.getItem('sr_mVol') || '80')
};

// --- 3D ENGINE (THREE.JS) ---
const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050014, 0.02); // Deep space background

// Camera setup for perspective highway - Adjusted to make lanes stand more upright
// Lower FOV reduces perspective distortion, making things look more parallel/vertical
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
// Move camera further back and higher to compensate for smaller FOV, look slightly up from down
camera.position.set(0, 20, 35);
camera.lookAt(0, 2, -10);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Environment (Denpa Grid)
// Drastically darkened the grid so it doesn't hurt the eyes (dark purple and dark teal)
const gridHelper = new THREE.GridHelper(200, 100, 0x440044, 0x004444);
gridHelper.position.y = -0.5; // Lowered geometry slightly so it doesn't clip with tracks
scene.add(gridHelper);

// Highway Tracks
const laneCount = 4;
const laneWidth = 2;
const totalWidth = laneCount * laneWidth;
const trackGroup = new THREE.Group();

const laneColors = [0xFF00FF, 0x00FFFF, 0x00FFFF, 0xFF00FF];
const trackMats = laneColors.map(color => new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.2, // Increased for better visibility
    side: THREE.DoubleSide
}));

const judgmentZ = userSettings.judgZ; // Use loaded position


for (let i = 0; i < laneCount; i++) {
    const laneGeo = new THREE.PlaneGeometry(laneWidth - 0.2, 200);
    const laneMesh = new THREE.Mesh(laneGeo, trackMats[i]);
    laneMesh.rotation.x = -Math.PI / 2;
    laneMesh.position.x = (i * laneWidth) - (totalWidth / 2) + (laneWidth / 2);
    laneMesh.position.z = -80; // Start far back
    trackGroup.add(laneMesh);
}
scene.add(trackGroup);

// Judgment Line in 3D - Modern Glowing Strip
const jlHeight = 0.05; // Very slim
const jlDepth = 0.8;
const jlGeo = new THREE.BoxGeometry(totalWidth, jlHeight, jlDepth);
// High intensity emissive material
const jlMat = new THREE.MeshStandardMaterial({ 
    color: 0xffffff, 
    emissive: 0xffffff,
    emissiveIntensity: 2.0,
    transparent: true, 
    opacity: 0.9 
});
const judgementLine = new THREE.Mesh(jlGeo, jlMat);

// Add a glowing neon pink outline
const jlEdges = new THREE.EdgesGeometry(jlGeo);
const jlLine = new THREE.LineSegments(jlEdges, new THREE.LineBasicMaterial({ color: 0xFF00FF, linewidth: 2 }));
judgementLine.add(jlLine);

// Sitting exactly on the tracks
judgementLine.position.set(0, 0.05, judgmentZ);
scene.add(judgementLine);

// Key press highlight meshes
const keyHighlightMeshes = [];
for (let i = 0; i < laneCount; i++) {
    const hGeo = new THREE.PlaneGeometry(laneWidth - 0.2, 40);
    const hMat = new THREE.MeshBasicMaterial({ 
        color: laneColors[i],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending 
    });
    const hMesh = new THREE.Mesh(hGeo, hMat);
    hMesh.rotation.x = -Math.PI / 2;
    hMesh.position.x = (i * laneWidth) - (totalWidth / 2) + (laneWidth / 2);
    hMesh.position.z = judgmentZ - 18; // Extend behind and slightly in front
    scene.add(hMesh);
    keyHighlightMeshes.push(hMesh);
}

// Visual Particles System
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
function spawnParticles(laneIndex, color, count=10) {
    const x = (laneIndex * laneWidth) - (totalWidth / 2) + (laneWidth / 2);
    const mat = new THREE.MeshBasicMaterial({ color: color, blending: THREE.AdditiveBlending });
    for(let i=0; i<count; i++) {
        const p = new THREE.Mesh(particleGeo, mat);
        p.position.set(x + (Math.random() - 0.5), 0.5, judgmentZ);
        p.velocity = new THREE.Vector3((Math.random() - 0.5)*0.5, Math.random()*0.5, (Math.random() - 0.5)*0.5);
        p.life = 1.0;
        scene.add(p);
        particles.push(p);
    }
}

// Camera Shake Data
let shakeTime = 0;
let shakeIntensity = 0;
const baseCameraPos = camera.position.clone();

function addCameraShake(intensity) {
    shakeTime = 0.15; // Shorter
    shakeIntensity = intensity * 0.3; // Greatly reduced overall shake multiplier
}

// Dynamic Materials for Note Types
// Thickened the note geometry for much better 3D visibility against the dark background
const noteGeo = new THREE.BoxGeometry(laneWidth - 0.4, 1.2, 1.0);
function getNoteMaterial(laneIndex) {
    return new THREE.MeshStandardMaterial({
        color: laneColors[laneIndex],
        emissive: laneColors[laneIndex],
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
    });
}
// Enhance lighting for the 3D shiny effect
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 10, 5);
scene.add(dirLight);

// --- GAME LOGIC STATE ---
let gameState = 'SONG_SELECT'; // SONG_SELECT, LOADING, READY, PLAYING, END, ERROR, RECORDING, RECORD_END
let currentSongId = null;
let audio = null;
let beatmap = { notes: [] };

let score = 0;
let combo = 0;
let maxCombo = 0;
let hits = { perfect: 0, great: 0, good: 0, miss: 0 };

const keys = { 'd': false, 'f': false, 'j': false, 'k': false };
const laneMap = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };

let noteMeshes = []; // Keep track of rendered 3D notes mapping to beatmap logic

const speed3D = 40; // Units per second in 3D space

// Recording State
let recordBpm = 120;
let recordingNotes = [];
let activeHolds = [null, null, null, null];
const QUANTIZE_DIVISOR = 4;

// --- DOM ELEMENTS ---
const screens = {
    songSelect: document.getElementById('song-select-screen'),
    hud: document.getElementById('game-hud'),
    result: document.getElementById('result-screen'),
    error: document.getElementById('error-screen'),
    settings: document.getElementById('settings-modal'),
    calibration: document.getElementById('calibration-screen')
};

function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenId].classList.add('active');
    
    // UI layer specific display handling
    if (screenId === 'settings' || screenId === 'calibration') {
        screens[screenId].style.display = 'flex';
    } else {
        screens.settings.style.display = 'none';
        screens.calibration.style.display = 'none';
    }
}

// --- SETTINGS UI BINDINGS ---
document.getElementById('settings-open-btn').addEventListener('click', () => {
    // Populate UI with current settings
    document.getElementById('set-offset').value = userSettings.offset;
    document.getElementById('val-offset').innerText = userSettings.offset;
    document.getElementById('set-judg').value = userSettings.judgZ;
    document.getElementById('val-judg').innerText = userSettings.judgZ;
    document.getElementById('set-vol').value = userSettings.seVol;
    document.getElementById('val-vol').innerText = userSettings.seVol;
    document.getElementById('set-mvol').value = userSettings.musicVol;
    document.getElementById('val-mvol').innerText = userSettings.musicVol;
    
    showScreen('settings');
});

document.getElementById('settings-close-btn').addEventListener('click', () => {
    screens.settings.style.display = 'none';
});

// --- CALIBRATION LOGIC ---
let calibData = {
    taps: [],
    bpm: 120, // Standard calibration BPM
    interval: 500, // ms per beat
    startTime: 0,
    tempOffset: 0
};

document.getElementById('calib-open-btn').addEventListener('click', () => {
    calibData.taps = [];
    calibData.tempOffset = 0;
    calibData.startTime = performance.now();
    document.getElementById('calib-offset-val').innerText = '0';
    document.getElementById('calib-tap-count').innerText = '0';
    
    gameState = 'CALIBRATING';
    showScreen('calibration');
});

document.getElementById('calib-cancel-btn').addEventListener('click', () => {
    gameState = 'SONG_SELECT';
    showScreen('settings');
});

document.getElementById('calib-apply-btn').addEventListener('click', () => {
    userSettings.offset = calibData.tempOffset;
    localStorage.setItem('sr_offset', userSettings.offset);
    document.getElementById('set-offset').value = userSettings.offset;
    document.getElementById('val-offset').innerText = userSettings.offset;
    
    gameState = 'SONG_SELECT';
    showScreen('settings');
});

function handleCalibrationTap() {
    const now = performance.now();
    const elapsed = now - calibData.startTime;
    
    // Find closest beat
    const beatIndex = Math.round(elapsed / calibData.interval);
    const intendedTime = beatIndex * calibData.interval;
    const diff = elapsed - intendedTime; // Positive = late, Negative = early
    
    // We want to subtract this diff from the offset
    // If you tap 20ms LATE (diff = 20), we need offset to be -20 so the music plays earlier
    calibData.taps.push(diff);
    if (calibData.taps.length > 20) calibData.taps.shift();
    
    const avg = calibData.taps.reduce((a, b) => a + b, 0) / calibData.taps.length;
    calibData.tempOffset = Math.round(-avg); // Invert because offset is (music - notes), if notes are LATE, avg is positive, so offset should be negative
    
    document.getElementById('calib-offset-val').innerText = calibData.tempOffset;
    document.getElementById('calib-tap-count').innerText = calibData.taps.length;
    
    // Visual feedback
    se.playTone(440, 'triangle', 0.1, 0.3);
}

// Live updates
document.getElementById('set-offset').addEventListener('input', (e) => {
    userSettings.offset = parseInt(e.target.value);
    document.getElementById('val-offset').innerText = userSettings.offset;
    localStorage.setItem('sr_offset', userSettings.offset);
});
document.getElementById('set-judg').addEventListener('input', (e) => {
    userSettings.judgZ = parseFloat(e.target.value);
    document.getElementById('val-judg').innerText = userSettings.judgZ;
    localStorage.setItem('sr_judgZ', userSettings.judgZ);
    // Live update Judgment Line in 3D
    judgementLine.position.z = userSettings.judgZ;
});
document.getElementById('set-vol').addEventListener('input', (e) => {
    userSettings.seVol = parseInt(e.target.value);
    document.getElementById('val-vol').innerText = userSettings.seVol;
    localStorage.setItem('sr_seVol', userSettings.seVol);
    se.setVolume(userSettings.seVol);
    // Test beep
    se.playHit('PERFECT');
});
document.getElementById('set-mvol').addEventListener('input', (e) => {
    userSettings.musicVol = parseInt(e.target.value);
    document.getElementById('val-mvol').innerText = userSettings.musicVol;
    localStorage.setItem('sr_mVol', userSettings.musicVol);
    if (audio) audio.volume = userSettings.musicVol / 100;
});

// --- INITIALIZATION ---
async function fetchSongs() {
    try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('API down');
        const songs = await res.json();
        
        const songList = document.getElementById('song-list');
        songList.innerHTML = '';
        
        songs.forEach(song => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.innerHTML = `<h2>${song.name}</h2>`;
            card.onclick = () => loadSong(song.id);
            songList.appendChild(card);
        });
    } catch (e) {
        showError(e.message);
    }
}

async function loadSong(songId) {
    currentSongId = songId;
    gameState = 'LOADING';
    showScreen('hud');
    displayJudgment('LOADING...', '#fff');
    
    try {
        const res = await fetch(`songs/${songId}/beatmap.json`);
        beatmap = await res.json();
        if (beatmap.bpm) recordBpm = beatmap.bpm;
        
        // Prepare logical notes map
        beatmap.notes.sort((a, b) => a.time - b.time);
        beatmap.notes.forEach((n, idx) => {
            n.hit = false;
            n.missed = false;
            n.holdActive = false;
            n.idx = idx;
        });

        // Pre-build 3D Meshes for notes
        noteMeshes.forEach(nm => scene.remove(nm.mesh));
        noteMeshes = [];

        beatmap.notes.forEach(note => {
            const mat = getNoteMaterial(note.lane);
            let mesh;
            
            if (note.duration && note.duration > 0) {
                // Hold note
                const length = note.duration * speed3D;
                // Slightly thinner on Y for hold notes to distinguish from hit head, but still thick enough
                const hGeo = new THREE.BoxGeometry(laneWidth - 0.4, 0.8, length);
                // Shift geometry so origin is at the bottom (startTime) instead of center
                hGeo.translate(0, 0, -length/2);
                mesh = new THREE.Mesh(hGeo, mat);
                
                // Add Edges for high contrast visibility
                const edges = new THREE.EdgesGeometry(hGeo);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
                mesh.add(line);
            } else {
                // Short note
                mesh = new THREE.Mesh(noteGeo, mat);
                
                // Add Edges for high contrast visibility
                const edges = new THREE.EdgesGeometry(noteGeo);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
                mesh.add(line);
            }
            
            const x = (note.lane * laneWidth) - (totalWidth / 2) + (laneWidth / 2);
            mesh.position.set(x, 0, -1000); // Hide far away initially
            scene.add(mesh);
            noteMeshes.push({ ref: note, mesh: mesh });
        });

        audio = new Audio(`songs/${songId}/audio.mp3`);
        audio.addEventListener('canplaythrough', () => {
             if (gameState === 'LOADING') {
                 gameState = 'READY';
                 displayJudgment('PRESS SPACE', '#00FFFF');
             }
        }, {once: true});
        
        audio.addEventListener('error', () => {
            if (gameState === 'LOADING') {
                gameState = 'READY';
                displayJudgment('NO AUDIO - SPACE TO START', '#FF00FF');
            }
        });
        audio.load();

        // Failsafe if canplaythrough doesn't trigger
        setTimeout(() => { if(gameState==='LOADING') { gameState='READY'; displayJudgment('READY', '#00FFFF'); } }, 1500);

    } catch(e) {
        showError(e.message);
    }
}

function showError(msg) {
    gameState = 'ERROR';
    document.getElementById('error-msg').innerText = msg;
    showScreen('error');
}

// --- INPUT & LOGIC ---
window.addEventListener('keydown', e => {
    if (e.repeat) return;
    
    // Auto-resume Audio Context for SE (requires user interaction)
    if (se.ctx.state === 'suspended') se.ctx.resume();

    const code = e.code;
    const key = e.key.toLowerCase();

    if (code === 'Space') {
        if (gameState === 'READY') {
            startGame();
        } else if (gameState === 'END' || gameState === 'RECORD_END') {
            resetGame();
        } else if (gameState === 'RECORDING') {
            endRecording();
        } else if (gameState === 'CALIBRATING') {
            // Space to stop calibration and show result is already handled by Apply but good for shortcut
        }
        return;
    }

    if (gameState === 'CALIBRATING') {
        handleCalibrationTap();
        return;
    }

    if (key === 'r' && gameState === 'READY') {
        startRecording();
        return;
    }

    if (keys[key] !== undefined && !keys[key]) {
        keys[key] = true;
        highlightKeyDom(key, true);
        // Significantly lower opacity so it doesn't mask overlapping incoming notes or hold tails
        keyHighlightMeshes[laneMap[key]].material.opacity = 0.15;

        if (gameState === 'PLAYING') {
            processHit(laneMap[key]);
        } else if (gameState === 'RECORDING') {
            processRecordDown(laneMap[key]);
        }
    }
});

window.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    if (keys[key] !== undefined) {
        keys[key] = false;
        highlightKeyDom(key, false);
        keyHighlightMeshes[laneMap[key]].material.opacity = 0;

        if (gameState === 'PLAYING') {
            processRelease(laneMap[key]);
        } else if (gameState === 'RECORDING') {
            processRecordUp(laneMap[key]);
        }
    }
});

function highlightKeyDom(key, activate) {
    const el = document.querySelector(`.key-btn[data-key="${key}"]`);
    if (el) {
        if (activate) el.classList.add('active', key);
        else el.classList.remove('active', key);
    }
}

function processHit(lane) {
    if (!audio) return;
    // Apply user audio offset (ms to seconds)
    const time = audio.currentTime - (userSettings.offset / 1000);
    
    // Find closest unhit note in lane
    let closest = null;
    let minDiff = Infinity;
    
    for (let note of beatmap.notes) {
        if (note.lane === lane && !note.hit && !note.missed && !note.holdActive) {
            let diff = Math.abs(time - note.time);
            if (diff < minDiff && diff < 0.2) { // Hit window
                minDiff = diff;
                closest = note;
            }
        }
    }

    if (closest) {
        if (minDiff <= 0.05) { handleJudgment(closest, 'PERFECT'); }
        else if (minDiff <= 0.1) { handleJudgment(closest, 'GREAT'); }
        else { handleJudgment(closest, 'GOOD'); }
        
        spawnParticles(lane, laneColors[lane], 15);
        
        if (closest.duration > 0) {
            closest.holdActive = true; 
        } else {
            closest.hit = true;
            // hide mesh
            const nm = noteMeshes.find(m => m.ref.idx === closest.idx);
            if (nm) nm.mesh.visible = false;
        }
    }
}

function processRelease(lane) {
    if (!audio) return;
    // Apply user audio offset
    const time = audio.currentTime - (userSettings.offset / 1000);

    for (let note of beatmap.notes) {
        if (note.lane === lane && note.holdActive) {
            note.holdActive = false;
            note.hit = true;
            
            const expectedEnd = note.time + note.duration;
            const diff = Math.abs(time - expectedEnd);
            
            const nm = noteMeshes.find(m => m.ref.idx === note.idx);
            if (nm) nm.mesh.visible = false;

            if (diff < 0.15) {
                handleJudgment(note, 'PERFECT');
            } else if (diff < 0.3) {
                handleJudgment(note, 'GOOD');
            } else {
                handleJudgment(note, 'MISS');
            }
            spawnParticles(lane, laneColors[lane], 10);
        }
    }
}

function handleJudgment(note, type) {
    if (type !== 'MISS') {
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        if (type === 'PERFECT') {
            score += 300; hits.perfect++;
            displayJudgment('PERFECT', 'var(--neon-cyan)');
            addCameraShake(0.3); // Heavy shake
        } else if (type === 'GREAT') {
            score += 100; hits.great++;
            displayJudgment('GREAT', 'var(--neon-lime)');
            addCameraShake(0.15); // Mild shake
        } else {
            score += 50; hits.good++;
            displayJudgment('GOOD', '#FFD100');
        }
    } else {
        combo = 0; hits.miss++;
        displayJudgment('MISS', 'var(--neon-pink)');
        note.missed = true;
        // Turn mesh grey if missed
        const nm = noteMeshes.find(m => m.ref.idx === note.idx);
        if (nm) nm.mesh.material.color.setHex(0x555555);
    }
    
    updateHUD();
    se.playHit(type);
}

function updateHUD() {
    document.getElementById('score-display').innerText = String(score).padStart(7, '0');
    const comboEl = document.getElementById('combo-display');
    comboEl.innerText = combo;
    comboEl.setAttribute('data-text', combo);
    
    // trigger glitch anim
    comboEl.classList.remove('active');
    void comboEl.offsetWidth; 
    comboEl.classList.add('active');
}

function displayJudgment(text, color) {
    const el = document.getElementById('judgment-display');
    el.innerText = text;
    el.style.color = color;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
}

function startGame() {
    gameState = 'PLAYING';
    document.getElementById('judgment-display').classList.remove('show');
    audio.currentTime = 0;
    audio.volume = userSettings.musicVol / 100;
    audio.play();
}

// --- RECORD STATE ---
function quantize(time, bpm, div = 4) {
    const sn = (60 / bpm) / div;
    return Math.round(time / sn) * sn;
}

function processRecordDown(lane) {
    if (!audio) return;
    const time = audio.currentTime;
    activeHolds[lane] = { start: time, qStart: quantize(time, recordBpm, QUANTIZE_DIVISOR), lane };
    spawnParticles(lane, 0xffffff, 5);
}

function processRecordUp(lane) {
    if (!activeHolds[lane]) return;
    const hold = activeHolds[lane];
    const time = audio ? audio.currentTime : hold.start;
    const duration = time - hold.start;
    
    let finalDur = undefined;
    if (duration > 0.15) {
        finalDur = quantize(time, recordBpm, QUANTIZE_DIVISOR) - hold.qStart;
        if(finalDur < 0) finalDur = undefined;
    }
    
    recordingNotes.push({
        time: parseFloat(hold.qStart.toFixed(3)),
        lane: hold.lane,
        duration: finalDur ? parseFloat(finalDur.toFixed(3)) : undefined
    });
    
    activeHolds[lane] = null;
    document.getElementById('record-count').innerText = `Notes: ${recordingNotes.length}`;
}

function startRecording() {
    gameState = 'RECORDING';
    document.getElementById('record-hud').style.display = 'block';
    document.getElementById('judgment-display').classList.remove('show');
    recordingNotes = [];
    audio.currentTime = 0;
    audio.play();
}

async function endRecording() {
    if(gameState === 'RECORD_END') return;
    gameState = 'RECORD_END';
    audio.pause();
    document.getElementById('record-hud').style.display = 'none';
    
    recordingNotes.sort((a,b)=>a.time - b.time);
    const newMap = {
        title: beatmap ? beatmap.title : "Custom DB Track",
        bpm: recordBpm,
        offset: 0,
        notes: recordingNotes
    };
    
    try {
        await fetch('/api/save_beatmap', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ songId: currentSongId, beatmapData: newMap })
        });
        displayJudgment('SAVED!', '#00ff00');
    } catch(e) { console.error('db save failed', e); }
}

function endGame() {
    if (gameState === 'END') return;
    gameState = 'END';
    audio.pause();
    
    document.getElementById('res-score').innerText = score;
    document.getElementById('res-combo').innerText = maxCombo;
    document.getElementById('res-perfect').innerText = hits.perfect;
    document.getElementById('res-great').innerText = hits.great;
    document.getElementById('res-good').innerText = hits.good;
    document.getElementById('res-miss').innerText = hits.miss;
    
    showScreen('result');
    
    // Save score API placeholder
    fetch('/api/score', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({name:'Player', score, combo: maxCombo})
    }).catch(e=>console.log('Leaderboard write skip: ', e));
}

function resetGame() {
    score = 0; combo = 0; maxCombo = 0;
    hits = {perfect:0, great:0, good:0, miss:0};
    updateHUD();
    document.getElementById('progress-bar').style.width = '0%';
    showScreen('songSelect');
    gameState = 'SONG_SELECT';
}

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const dt = clock.getDelta();
    
    // Grid animation illusion
    gridHelper.position.z += speed3D * dt;
    if (gridHelper.position.z > 10) gridHelper.position.z = 0;

    // Camera Shake
    if (shakeTime > 0) {
        shakeTime -= dt;
        camera.position.x = baseCameraPos.x + (Math.random() - 0.5) * shakeIntensity;
        camera.position.y = baseCameraPos.y + (Math.random() - 0.5) * shakeIntensity;
    } else {
        camera.position.lerp(baseCameraPos, 0.1);
    }

    // Particle update
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.position.addScaledVector(p.velocity, dt * 60);
        p.material.opacity = p.life;
        p.rotation.x += 0.1;
        p.rotation.y += 0.1;
        p.life -= dt * 2;
        if (p.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    if (gameState === 'PLAYING') {
        // Apply user audio offset visually to note movements
        const time = audio ? audio.currentTime - (userSettings.offset / 1000) : 0;
        
        // Progress Bar
        const dur = audio && audio.duration ? audio.duration : 1;
        document.getElementById('progress-bar').style.width = `${(time/dur)*100}%`;

        // Update Note Meshes
        noteMeshes.forEach(nm => {
            const note = nm.ref;
            if (note.hit || (note.missed && !note.duration)) return;

            // z position based on speed
            if (note.duration && note.holdActive) {
                // If holding, anchor head at dynamic judgment position, physically scale Z down so tail approaches
                const remainingDuration = (note.time + note.duration) - time;
                if (remainingDuration > 0) {
                    nm.mesh.position.z = userSettings.judgZ;
                    nm.mesh.scale.z = remainingDuration / note.duration;
                } else {
                    nm.mesh.visible = false;
                }
            } else {
                nm.mesh.position.z = userSettings.judgZ - ((note.time - time) * speed3D);
                nm.mesh.scale.z = 1.0;
            }

            // Miss detection for untouched short notes
            if (!note.hit && !note.missed && !note.holdActive && time - note.time > 0.2) {
                handleJudgment(note, 'MISS');
            }
        });

        // Trigger end logic
        if (audio && audio.ended) {
            endGame();
        } else if (beatmap.notes.length > 0) {
            let lastNote = beatmap.notes[beatmap.notes.length - 1];
            if (time > lastNote.time + (lastNote.duration||0) + 3) endGame();
        }
    } else if (gameState === 'RECORDING') {
        const time = audio ? audio.currentTime : 0;
        const dur = audio && audio.duration ? audio.duration : 1;
        document.getElementById('progress-bar').style.width = `${(time/dur)*100}%`;
        if (audio && audio.ended) endRecording();
    } else if (gameState === 'CALIBRATING') {
        const now = performance.now();
        const elapsed = now - calibData.startTime;
        const beatProgress = (elapsed % calibData.interval) / calibData.interval;
        
        // Custom metronome beat logic
        const beatIndex = Math.floor(elapsed / calibData.interval);
        if (!calibData.lastBeatIndex || calibData.lastBeatIndex !== beatIndex) {
            calibData.lastBeatIndex = beatIndex;
            // Play metronome beep at the start of each beat
            se.playTone(880, 'sine', 0.05, 0.2);
            // Trigger visual pulse
            const pulse = document.getElementById('calib-pulse');
            pulse.classList.remove('active');
            void pulse.offsetWidth;
            pulse.classList.add('active');
        }
    }

    renderer.render(scene, camera);
}

// Init
fetchSongs();
showScreen('songSelect'); // Ensure UI is reset to song select on start
animate();
