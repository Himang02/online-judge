
const authService = require('../services/authService')
const jwtUtil = require('../utils/jwtUtil');

async function registerUser(req, res) {

    // extract fields from request body
    const { name, username, email, password } = req.body;

    try {
        // register user
        const user = await authService.registerUser(name, username, email, password);

        // generate jwt token
        const token = jwtUtil.generateToken(user);

        // return user and token
        return res.status(201).json({ user, token });
    }
    catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
}

async function loginUser(req, res) {

    // extract fields from request body
    const { email, password } = req.body;

    try {
        // login user
        const user = await authService.loginUser(email, password);

        // generate jwt token
        const token = jwtUtil.generateToken(user);

        // return user and token
        return res.status(200).json({ user, token });
    }
    catch (err) {
        return res.status(err.statusCode || 500).json({ error: err.message });
    }
}

module.exports = {
    registerUser,
    loginUser
}