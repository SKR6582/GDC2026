const fs = require('fs');
const MusicTempo = require('music-tempo');
const AudioContext = require('web-audio-api').AudioContext;

const context = new AudioContext();

const filePath = 'public/song.mp3';
console.log(`Analyzing audio file: ${filePath}...`);

try {
    const data = fs.readFileSync(filePath);
    context.decodeAudioData(data, (buffer) => {
        console.log("Audio decoded successfully. Analyzing beats...");

        let audioData = [];
        // Only use the first channel if it's stereo, or mix both
        if (buffer.numberOfChannels == 2) {
            let channel1Data = buffer.getChannelData(0);
            let channel2Data = buffer.getChannelData(1);
            let length = channel1Data.length;
            for (let i = 0; i < length; i++) {
                audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
            }
        } else {
            audioData = buffer.getChannelData(0);
        }

        // This process might take some time for full songs
        const mt = new MusicTempo(audioData);

        // Ensure tempo is a valid number, otherwise default to 120
        const bpm = mt.tempo ? Math.round(mt.tempo) : 120;
        console.log(`Detected BPM: ${bpm}`);

        // mt.beats gives an array of timestamps (in seconds) where a beat occurs
        const notes = [];

        mt.beats.forEach((time) => {
            // Keep exactly 2 decimal places for better precision
            const roundedTime = Math.round(time * 100) / 100;

            // Randomly map the beat to one of the 4 keys
            notes.push({
                time: roundedTime,
                lane: Math.floor(Math.random() * 4)
            });

            // Add some variation (e.g. 1/8th or 1/16th notes randomly if we want a denser chart)
            // But let's keep it simple with just the main detected beats for now
        });

        // Sort notes just to be sure
        notes.sort((a, b) => a.time - b.time);

        const beatmap = {
            title: "Auto-Generated Beatmap",
            bpm: bpm,
            offset: 0,
            notes: notes
        };

        fs.writeFileSync('public/beatmap.json', JSON.stringify(beatmap, null, 2));
        console.log(`Generated beatmap.json with ${notes.length} notes!`);
        process.exit(0);
    }, (err) => {
        console.error("Failed to decode audio:", err);
        process.exit(1);
    });
} catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    process.exit(1);
}
