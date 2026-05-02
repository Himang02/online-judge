const express = require('express');
const app = express();

const authRoutes = require('./modules/auth/authRoutes');
const problemRoutes = require('./modules/problems/problemRoutes');
const tagRoutes = require('./modules/problems/tagRoutes');
const submissionRoutes = require('./modules/submissions/submissionRoutes');

app.use(express.json());

app.get('/ping', (req, res) => {
    res.json({ message: 'pong' });
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/submissions', submissionRoutes);

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