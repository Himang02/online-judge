require('dotenv').config();
const { pullImages } = require('./src/warmup');

pullImages().then(() => {
    const worker = require('./src/worker');
    console.log('[Execution Service] Ready — waiting for jobs.');

    process.on('SIGTERM', async () => {
        await worker.close();
        process.exit(0);
    });
});
