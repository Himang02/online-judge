const { spawn } = require('child_process');
const { LANGUAGE_CONFIG } = require('./executor');

function pullImage(image) {
    return new Promise((resolve) => {
        console.log(`[Warmup] Pulling ${image}...`);
        const proc = spawn('docker', ['pull', image], { stdio: 'inherit' });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`[Warmup] ✓ ${image}`);
            } else {
                console.warn(`[Warmup] ✗ ${image} pull failed (exit ${code}) — continuing anyway`);
            }
            resolve();
        });

        proc.on('error', (err) => {
            console.warn(`[Warmup] ✗ ${image} error: ${err.message} — continuing anyway`);
            resolve();
        });
    });
}

async function pullImages() {
    const images = [...new Set(Object.values(LANGUAGE_CONFIG).map((c) => c.image))];
    console.log(`[Warmup] Pre-pulling ${images.length} image(s): ${images.join(', ')}`);

    await Promise.all(images.map(pullImage));

    console.log('[Warmup] All image pulls complete.');
}

module.exports = { pullImages };
