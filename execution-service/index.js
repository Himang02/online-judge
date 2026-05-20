require('dotenv').config();
const worker = require('./src/worker');

console.log('Execution service started, waiting for jobs...');

process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
});
