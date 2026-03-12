const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME SETTINGS & ENGINE STATE ---
let gameState = 'SONG_SELECT'; // SONG_SELECT, START, LOADING, PLAYING, END, ERROR, RECORDING, RECORD_END
let audio = null;
let currentSongId = null;

let beatmap = null;
let score = 0;
let combo = 0;
let maxCombo = 0;
let hits = { perfect: 0, great: 0, good: 0, miss: 0 };

// Recording mode variables
let recordingNotes = [];
let activeHolds = [null, null, null, null];
let recordBpm = 120;
const QUANTIZE_DIVISOR = 4;

const keys = { 'd': false, 'f': false, 'j': false, 'k': false };
const laneMap = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };
const laneColors = ['#FF2A5F', '#00E5FF', '#00E5FF', '#FF2A5F'];
const laneColorsGradient = [
    { start: '#FF2A5F', end: '#FF7B9C' },
    { start: '#00E5FF', end: '#73F2FF' },
    { start: '#00E5FF', end: '#73F2FF' },
    { start: '#FF2A5F', end: '#FF7B9C' }
];

const laneWidth = 130; // Slightly wider lanes for premium feel
const startX = (canvas.width - (laneWidth * 4)) / 2;
const lanePositions = [
    startX + laneWidth * 0 + laneWidth / 2,
    startX + laneWidth * 1 + laneWidth / 2,
    startX + laneWidth * 2 + laneWidth / 2,
    startX + laneWidth * 3 + laneWidth / 2
];

const scrollSpeed = 850; // Slightly faster for excitement
const hitY = 750;

let judgmentText = null; 
let errorMsg = '';
let explosions = [];

// --- INIT & SONG SELECT ---
async function fetchSongs() {
    try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('Failed to load songs');
        const songs = await res.json();
        
        const songList = document.getElementById('song-list');
        songList.innerHTML = '';
        
        if (songs.length === 0) {
            songList.innerHTML = '<p style="color:var(--text-muted); font-size: 1.2rem;">No songs found in public/songs/</p>';
            return;
        }

        songs.forEach(song => {
            const card = document.createElement('div');
            card.className = 'song-card';
            card.innerHTML = `<h2>${song.name}</h2>`;
            card.onclick = () => selectSong(song.id);
            songList.appendChild(card);
        });
    } catch (e) {
        console.error(e);
        errorMsg = e.message;
        gameState = 'ERROR';
    }
}

async function selectSong(songId) {
    currentSongId = songId;
    document.getElementById('song-select-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    gameState = 'LOADING';
    
    try {
        const res = await fetch(`songs/${songId}/beatmap.json`);
        if (!res.ok) throw new Error('Failed to load beatmap.json');
        beatmap = await res.json();
        
        if (beatmap.bpm) recordBpm = beatmap.bpm;
        
        beatmap.notes.sort((a, b) => a.time - b.time);
        beatmap.notes.forEach(n => {
            n.hit = false;
            n.missed = false;
            n.holdCurrentY = 0;
            n.holdActive = false;
        });

        audio = new Audio(`songs/${songId}/audio.mp3`);
        audio.addEventListener('canplaythrough', () => {
             if (gameState === 'LOADING') gameState = 'START_READY';
        });
        audio.addEventListener('error', () => {
            console.warn('Audio not found. Place audio.mp3 in the song folder.');
            if (gameState === 'LOADING') gameState = 'START_READY'; 
        });

        audio.load();

        setTimeout(() => {
            if (gameState === 'LOADING') gameState = 'START_READY';
        }, 1000);

    } catch (e) {
        console.error(e);
        errorMsg = e.message;
        gameState = 'ERROR';
    }
}

// --- INPUT HANDLING ---
window.addEventListener('keydown', e => {
    if (e.repeat) return;
    
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'START_READY') {
            startGame();
            return;
        } else if (gameState === 'END' || gameState === 'RECORD_END') {
            location.reload();
        } else if (gameState === 'RECORDING') {
            endRecording();
            return;
        }
    }
    
    if (e.key.toLowerCase() === 'r' && (gameState === 'START' || gameState === 'START_READY')) {
        startRecording();
        return;
    }

    const key = e.key.toLowerCase();
    if (keys[key] !== undefined && !keys[key]) {
        keys[key] = true;
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
        if (gameState === 'RECORDING') {
            processRecordUp(laneMap[key]);
        } else if (gameState === 'PLAYING') {
            processHitRelease(laneMap[key]);
        }
    }
});

function processHit(lane) {
    const currentTime = audio ? audio.currentTime : 0;
    
    let closestNote = null;
    let minDiff = Infinity;
    
    for (let i = 0; i < beatmap.notes.length; i++) {
        let note = beatmap.notes[i];
        if (!note.hit && !note.missed && note.lane === lane && !note.holdActive) {
            let diff = Math.abs(currentTime - note.time);
            if (diff < minDiff && diff < 0.15) {
                minDiff = diff;
                closestNote = note;
            }
        }
    }
    
    if (closestNote) {
        if (!closestNote.duration) {
            closestNote.hit = true;
        }
        
        if (minDiff <= 0.05) {
            score += 300;
            combo++;
            hits.perfect++;
            showJudgment('PERFECT', '#00E5FF', 1.2);
        } else if (minDiff <= 0.10) {
            score += 100;
            combo++;
            hits.great++;
            showJudgment('GREAT', '#00FF66', 1.0);
        } else {
            score += 50;
            combo++;
            hits.good++;
            showJudgment('GOOD', '#FFD100', 0.8);
        }
        
        if (combo > maxCombo) maxCombo = combo;
        createHitEffect(closestNote.lane);
        
        if (closestNote.duration > 0) {
            closestNote.holdActive = true;
        }
    }
}

function processHitRelease(lane) {
    const currentTime = audio ? audio.currentTime : 0;
    
    for (let i = 0; i < beatmap.notes.length; i++) {
        let note = beatmap.notes[i];
        if (note.holdActive && note.lane === lane) {
            note.holdActive = false;
            
            const expectedEndTime = note.time + note.duration;
            const diff = Math.abs(currentTime - expectedEndTime);
            
            note.hit = true;
            
            if (diff < 0.15) {
                score += 300;
                combo++;
                hits.perfect++;
                showJudgment('PERFECT', '#00E5FF', 1.2);
            } else if (diff < 0.3) {
                score += 100;
                combo++;
                hits.great++;
                showJudgment('GREAT', '#00FF66', 1.0);
            } else {
                note.missed = true;
                combo = 0;
                hits.miss++;
                showJudgment('MISS', '#FF2A5F', 0.8);
            }
            createHitEffect(note.lane);
        }
    }
}

// --- RECORDING LOGIC ---
function quantize(time, bpm, divisor = QUANTIZE_DIVISOR) {
    const beatDuration = 60 / bpm;
    const snapDuration = beatDuration / divisor;
    return Math.round(time / snapDuration) * snapDuration;
}

function processRecordDown(lane) {
    if (!audio) return;
    const currentTime = audio.currentTime;
    const quantizedTime = quantize(currentTime, recordBpm, QUANTIZE_DIVISOR);
    
    activeHolds[lane] = {
        time: quantizedTime,
        exactStartTime: currentTime,
        lane: lane
    };
    
    createHitEffect(lane);
}

function processRecordUp(lane) {
    if (!activeHolds[lane]) return;
    
    const hold = activeHolds[lane];
    const exactEndTime = audio ? audio.currentTime : hold.exactStartTime;
    const rawDuration = exactEndTime - hold.exactStartTime;
    
    let finalDuration = 0;
    if (rawDuration > 0.15) {
        const quantizedEnd = quantize(exactEndTime, recordBpm, QUANTIZE_DIVISOR);
        finalDuration = Math.max(0, quantizedEnd - hold.time);
    }
    
    recordingNotes.push({
        time: parseFloat(hold.time.toFixed(3)),
        lane: hold.lane,
        duration: finalDuration > 0.05 ? parseFloat(finalDuration.toFixed(3)) : undefined
    });
    
    activeHolds[lane] = null;
}

function startRecording() {
    gameState = 'RECORDING';
    recordingNotes = [];
    activeHolds = [null, null, null, null];
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn("Audio play failed:", e);
        });
    }
}

async function endRecording() {
    if (gameState === 'RECORD_END') return;
    gameState = 'RECORD_END';
    if (audio) audio.pause();
    
    for (let i=0; i<4; i++) {
        if (activeHolds[i]) processRecordUp(i);
    }
    
    recordingNotes.sort((a, b) => a.time - b.time);
    
    const newBeatmap = {
        title: beatmap ? beatmap.title : "My Recorded Beatmap",
        bpm: recordBpm,
        offset: 0,
        notes: recordingNotes
    };
    
    try {
        await fetch('/api/save_beatmap', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ songId: currentSongId, beatmapData: newBeatmap })
        });
        beatmap = newBeatmap;
        console.log("Beatmap saved to server properly.");
    } catch(e) {
        console.error('Beatmap save failed', e);
    }
}

function createHitEffect(lane) {
    explosions.push({ x: lanePositions[lane], y: hitY, life: 1.0, color: laneColors[lane] });
}

function showJudgment(text, color, scale) {
    judgmentText = { text, color, scale, life: 1.0 };
}

function startGame() {
    gameState = 'PLAYING';
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.warn("Audio play failed:", e);
        });
    }
}

async function endGame() {
    if (gameState === 'END') return;
    gameState = 'END';
    if (audio) audio.pause();
    
    try {
        await fetch('/api/score', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: 'Player',
                score,
                combo: maxCombo
            })
        });
    } catch(e) {
        console.error('Leaderboard submission failed', e);
    }
}

// --- UPDATE LOOP ---
function update() {
    if (gameState !== 'PLAYING') return;

    const currentTime = audio ? audio.currentTime : 0;
    let allDone = true;

    beatmap.notes.forEach(note => {
        if (note.holdActive) {
            if (Math.random() > 0.7) createHitEffect(note.lane);
            score += 1;
            
            if (currentTime >= note.time + note.duration) {
                note.holdActive = false;
                note.hit = true;
                score += 300;
                combo++;
                hits.perfect++;
                showJudgment('PERFECT', '#00E5FF', 1.2);
                createHitEffect(note.lane);
            }
        }
        
        if (!note.hit && !note.missed && !note.holdActive) {
            if (currentTime - note.time > 0.15) {
                note.missed = true;
                combo = 0;
                hits.miss++;
                showJudgment('MISS', '#FF2A5F', 0.8);
            }
        }
        
        if (!note.hit && !note.missed) {
            allDone = false;
        }
    });

    if (audio && audio.ended) {
        if (gameState === 'RECORDING') {
            endRecording();
        } else {
            endGame();
        }
    } else if (allDone && beatmap.notes.length > 0 && gameState === 'PLAYING') {
        let lastNote = beatmap.notes[beatmap.notes.length - 1];
        if (currentTime > lastNote.time + (lastNote.duration || 0) + 3) {
            endGame();
        }
    }
}

// --- DRAW LOOP ---
function draw() {
    if (gameState === 'SONG_SELECT') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'START' || gameState === 'START_READY') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '900 48px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(beatmap ? beatmap.title : 'Stellar Rhythm', canvas.width/2, canvas.height/2 - 50);
        ctx.font = '300 24px Outfit';
        ctx.fillStyle = '#00E5FF';
        ctx.fillText(gameState === 'START_READY' ? 'Press SPACE to Start | Press R to Record' : 'Loading...', canvas.width/2, canvas.height/2 + 30);
        return;
    }

    if (gameState === 'ERROR') {
        ctx.fillStyle = '#FF2A5F';
        ctx.font = '500 24px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Error: ' + errorMsg, canvas.width/2, canvas.height/2);
        return;
    }

    const currentTime = audio ? audio.currentTime : 0;

    // Draw Lanes
    ctx.lineWidth = 1;
    for(let i=0; i<4; i++) {
        let lx = lanePositions[i] - laneWidth/2;
        ctx.fillStyle = keys[['d','f','j','k'][i]] ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.01)';
        ctx.fillRect(lx, 0, laneWidth, canvas.height);
        
        // Lane dividers
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(lx, 0, laneWidth, canvas.height);
    }

    // Judgment Line
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, hitY);
    ctx.lineTo(startX + laneWidth * 4, hitY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Key presses glow
    for(let i=0; i<4; i++) {
        if(keys[['d','f','j','k'][i]]) {
            let gradient = ctx.createLinearGradient(0, hitY, 0, hitY - 150);
            gradient.addColorStop(0, `${laneColors[i]}66`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(lanePositions[i] - laneWidth/2, hitY - 150, laneWidth, 150);
        }
    }

    ctx.font = '700 24px Outfit';
    ctx.textAlign = 'center';
    for(let i=0; i<4; i++) {
        ctx.fillStyle = keys[['d','f','j','k'][i]] ? '#fff' : 'rgba(255,255,255,0.2)';
        ctx.fillText(['D','F','J','K'][i], lanePositions[i], hitY + 50);
    }

    // Notes
    if (gameState === 'PLAYING') {
        beatmap.notes.forEach(note => {
            if (note.hit || note.missed) return;
            
            let noteY = hitY - ((note.time - currentTime) * scrollSpeed);
            
            if (noteY > -150 && noteY < canvas.height + 150) {
                const nHeight = 22;
                const nWidth = laneWidth - 24;
                const noteX = lanePositions[note.lane] - nWidth/2;
                
                // Draw hold tail if it has duration
                if (note.duration) {
                    const tailLength = note.duration * scrollSpeed;
                    
                    let gr = ctx.createLinearGradient(noteX, 0, noteX + nWidth, 0);
                    gr.addColorStop(0, `${laneColorsGradient[note.lane].start}88`);
                    gr.addColorStop(1, `${laneColorsGradient[note.lane].end}88`);
                    ctx.fillStyle = gr;
                    
                    if (note.holdActive) {
                        const activeTail = Math.max(0, tailLength - ((currentTime - note.time) * scrollSpeed));
                        ctx.fillRect(noteX + 4, hitY - activeTail - nHeight/2, nWidth - 8, activeTail);
                    } else {
                        ctx.fillRect(noteX + 4, noteY - tailLength - nHeight/2, nWidth - 8, tailLength);
                    }
                }
                
                // Head Note Gradient
                let noteGrad = ctx.createLinearGradient(noteX, noteY - nHeight/2, noteX + nWidth, noteY + nHeight/2);
                noteGrad.addColorStop(0, laneColorsGradient[note.lane].start);
                noteGrad.addColorStop(1, laneColorsGradient[note.lane].end);
                
                ctx.shadowBlur = 10;
                ctx.shadowColor = laneColors[note.lane];
                ctx.fillStyle = noteGrad;
                
                if (!note.holdActive) {
                    RoundRoundRect(ctx, noteX, noteY - nHeight/2, nWidth, nHeight, 8);
                } else {
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = '#fff';
                    RoundRoundRect(ctx, noteX + 4, hitY - nHeight/2, nWidth - 8, nHeight, 6);
                }
                
                ctx.shadowBlur = 0;
            }
        });
    }

    // Hit Explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        let exp = explosions[i];
        ctx.beginPath();
        let radius = (1 - exp.life) * 80;
        ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        
        // Gradient explosion
        let expGrad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
        expGrad.addColorStop(0, `rgba(255, 255, 255, ${exp.life})`);
        expGrad.addColorStop(1, `${exp.color}00`);
        ctx.fillStyle = expGrad;
        ctx.fill();
        
        exp.life -= 0.04;
        if(exp.life <= 0) explosions.splice(i, 1);
    }

    // UI Stats
    if (gameState === 'PLAYING') {
        ctx.fillStyle = '#fff';
        ctx.font = '500 28px Outfit';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE: ' + score, 30, 50);
        ctx.textAlign = 'right';
        ctx.fillText('COMBO: ' + combo, canvas.width - 30, 50);
    } else if (gameState === 'RECORDING') {
        ctx.fillStyle = '#FF2A5F';
        ctx.font = '900 36px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('🔴 RECORDING...', canvas.width/2, 60);
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '500 22px Outfit';
        ctx.fillText(`Notes recorded: ${recordingNotes.length}`, canvas.width/2, 100);
        
        for (let i=0; i<4; i++) {
            if (activeHolds[i]) {
                const hStart = hitY;
                const hEnd = hitY - ((currentTime - activeHolds[i].exactStartTime) * scrollSpeed);
                ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
                ctx.fillRect(lanePositions[i] - (laneWidth-24)/2 + 4, hEnd, (laneWidth-24) - 8, hStart - hEnd);
            }
        }
    }

    // Judgment Text
    if (judgmentText && judgmentText.life > 0) {
        ctx.save();
        ctx.translate(canvas.width/2, hitY - 200);
        let scale = judgmentText.scale + (1 - judgmentText.life) * 0.3;
        ctx.scale(scale, scale);
        
        ctx.font = '900 60px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowBlur = 30;
        ctx.shadowColor = judgmentText.color;
        
        // Fill judgment text with gradient
        let jGrad = ctx.createLinearGradient(0, -30, 0, 30);
        jGrad.addColorStop(0, '#ffffff');
        jGrad.addColorStop(1, judgmentText.color);
        ctx.fillStyle = jGrad;
        
        ctx.globalAlpha = judgmentText.life;
        ctx.fillText(judgmentText.text, 0, 0);
        
        ctx.restore();
        judgmentText.life -= 0.035;
    }

    // End Screens
    if (gameState === 'END') {
        ctx.fillStyle = 'rgba(7,7,17,0.9)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        
        ctx.font = '900 70px Outfit';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00E5FF';
        ctx.fillText('FINISH', canvas.width/2, canvas.height/2 - 120);
        ctx.shadowBlur = 0;
        
        ctx.font = '700 48px Outfit';
        ctx.fillStyle = '#00E5FF';
        ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 - 20);
        
        ctx.font = '500 28px Outfit';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Max Combo: ${maxCombo}`, canvas.width/2, canvas.height/2 + 40);
        
        ctx.font = '300 22px Outfit';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`Perfect: ${hits.perfect}   Great: ${hits.great}   Good: ${hits.good}   Miss: ${hits.miss}`, canvas.width/2, canvas.height/2 + 90);

        ctx.font = '300 22px Outfit';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('Press SPACE to select another track', canvas.width/2, canvas.height/2 + 180);
    }
    
    if (gameState === 'RECORD_END') {
        ctx.fillStyle = 'rgba(7,7,17,0.9)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00E5FF';
        ctx.textAlign = 'center';
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00E5FF';
        ctx.font = '900 60px Outfit';
        ctx.fillText('TRACK SAVED!', canvas.width/2, canvas.height/2 - 60);
        ctx.shadowBlur = 0;
        
        ctx.font = '500 28px Outfit';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Recorded ${recordingNotes.length} notes`, canvas.width/2, canvas.height/2 + 20);

        ctx.font = '300 22px Outfit';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('Press SPACE to restart and play', canvas.width/2, canvas.height/2 + 120);
    }
}

function RoundRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// --- MAIN LOOP ---
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

fetchSongs().then(() => {
    requestAnimationFrame(loop);
});
