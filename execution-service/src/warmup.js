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
    const all = [...new Set(Object.values(LANGUAGE_CONFIG).map((c) => c.image))];
    // Convention: images prefixed with 'oj-' are locally-built customizations
    // (e.g. oj-gcc with bits/stdc++.h precompiled) and aren't on any registry.
    // They must be built once on the host before starting this service.
    const pullable = all.filter((img) => !img.startsWith('oj-'));
    const local = all.filter((img) => img.startsWith('oj-'));

    if (local.length) {
        console.log(`[Warmup] Skipping pull for local-built image(s): ${local.join(', ')}`);
    }
    console.log(`[Warmup] Pre-pulling ${pullable.length} image(s): ${pullable.join(', ')}`);

    await Promise.all(pullable.map(pullImage));

    console.log('[Warmup] All image pulls complete.');
}

module.exports = { pullImages };
