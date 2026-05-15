const express = require("express");
const router = express.Router();
const targetController = require("../controllers/targetController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/admin");

// Bulk add or update targets
router.post("/bulk",auth, targetController.bulkUpsertTargets);

// Update a target by id
router.put("/:id",auth, targetController.updateTarget);

// Soft delete a target by id
router.delete("/:id",auth, targetController.deleteTarget);

// Get targets by date range
router.get("/",auth, targetController.getTargetsByDateRange);

// Get all targets with user information (Admin API)
router.get("/admin/all", auth, adminAuth, targetController.getAllTargetsWithUsers);

// Get all weeks data for a specific user (Admin API)
router.get("/admin/user/:userId", auth, adminAuth, targetController.getUserAllWeeksData);

module.exports = router;
