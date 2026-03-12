const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory leaderboard
let leaderboard = [];

app.post('/api/score', (req, res) => {
    const { name, score, combo, maxCombo } = req.body;
    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid score data' });
    }
    
    leaderboard.push({ name, score, combo, maxCombo, date: new Date() });
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep top 50
    if(leaderboard.length > 50) leaderboard.pop();
    
    // Calculate approximate rank
    const rank = leaderboard.findIndex(x => x.name === name && x.score === score && x.date.getTime() === leaderboard[leaderboard.length-1].date.getTime()) + 1;
    res.json({ success: true, rank: rank || leaderboard.length });
});

app.post('/api/save_beatmap', async (req, res) => {
    try {
        const { songId, beatmapData } = req.body;
        
        if (!songId || !beatmapData || !Array.isArray(beatmapData.notes)) {
            return res.status(400).json({ error: 'Invalid beatmap format or missing songId' });
        }
        
        const filePath = path.join(__dirname, 'public', 'songs', songId, 'beatmap.json');
        
        // Ensure directory exists
        await fs.ensureDir(path.join(__dirname, 'public', 'songs', songId));
        
        await fs.writeJson(filePath, beatmapData, { spaces: 2 });
        res.json({ success: true, message: 'Beatmap saved successfully' });
        console.log(`Saved new beatmap for ${songId} with ${beatmapData.notes.length} notes!`);
    } catch (e) {
        console.error('Failed to save beatmap:', e);
        res.status(500).json({ error: 'Failed to save beatmap' });
    }
});

app.get('/api/songs', async (req, res) => {
    try {
        const songsDir = path.join(__dirname, 'public', 'songs');
        if (!await fs.pathExists(songsDir)) {
            return res.json([]);
        }
        
        const files = await fs.readdir(songsDir);
        const songs = [];
        for (const file of files) {
            const stat = await fs.stat(path.join(songsDir, file));
            if (stat.isDirectory()) {
                songs.push({ id: file, name: file.replace(/_/g, ' ') });
            }
        }
        res.json(songs);
    } catch (e) {
        console.error('Failed to get songs:', e);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});

app.get('/api/leaderboard', (req, res) => {
    res.json(leaderboard.slice(0, 10));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`Rhythm Game Server running on http://localhost:${PORT}`);
    console.log(`Drop your song.mp3 in the /public folder!`);
    console.log(`===========================================`);
});
