require('dotenv').config();
const app = require('./src/app');
const { queueEvents } = require('./src/shared/configs/bootstrap');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));

process.on('SIGTERM', async () => {
    await queueEvents.close();
    process.exit(0);
});