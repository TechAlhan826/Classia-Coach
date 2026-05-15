const express = require("express");
const router = express.Router();
const planController = require("../controllers/planController");
const auth = require("../middleware/auth");

// Get plan data with week summary and exercise details
router.get("/", auth, planController.getPlan);

module.exports = router; 