const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();

const authRoutes = require('./modules/auth/authRoutes');
const problemRoutes = require('./modules/problems/problemRoutes');
const tagRoutes = require('./modules/problems/tagRoutes');
const submissionRoutes = require('./modules/submissions/submissionRoutes');

const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
}));
app.use(morgan(':method :url :status :res[content-length]b - :response-time ms'));
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

    if (statusCode >= 500) {
        console.error(`[Error] ${req.method} ${req.path} → ${statusCode}: ${err.message}`);
        console.error(err.stack);
    }

    res.status(statusCode).json({ error: message });
});




module.exports = app;