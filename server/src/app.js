const express = require('express');
const app = express();

const authRoutes = require('./modules/auth/authRoutes')

app.use(express.json());

app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;

    let message;
    if (err.type === 'entity.parse.failed') {
        message = 'Invalid JSON in request body';
    } else if (err.statusCode) {
        message = err.message;
    } else {
        message = 'Internal server error';
    }

    res.status(statusCode).json({ error: message });
});




module.exports = app;