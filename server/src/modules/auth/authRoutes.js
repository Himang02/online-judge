const express = require("express");
const router = express.Router();

const { registerValidators, loginValidators } = require("./authValidators");
const authController = require("./authController");

router.post("/register", registerValidators, authController.registerUser);

router.post("/login", loginValidators, authController.loginUser);

module.exports = router;