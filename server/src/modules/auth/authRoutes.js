const express = require("express");
const router = express.Router();

const { registerValidators, loginValidators } = require("./authValidators");
const { loginRateLimit, registerRateLimit } = require("../../shared/middlewares/authRateLimit");
const authController = require("./authController");

router.post("/register", registerRateLimit, registerValidators, authController.registerUser);

router.post("/login", loginRateLimit, loginValidators, authController.loginUser);

module.exports = router;