const express = require("express");
const router = express.Router();

const { registerValidators, loginValidators } = require("../middlewares/validators/authValidators");
const authController = require("../controllers/authController");

router.post("/register", registerValidators, authController.registerUser);

router.post("/login", loginValidators, authController.loginUser);

module.exports = router;