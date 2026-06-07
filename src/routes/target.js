const express = require("express");
const router = express.Router();
const targetController = require("../controllers/targetController");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/admin");

// Bulk add or update targets
router.post("/bulk", auth, targetController.bulkUpsertTargets);

// Update a target by id
router.put("/:id", auth, targetController.updateTarget);

// Soft delete a target by id
router.delete("/:id", auth, targetController.deleteTarget);

// Get targets by date range
router.get("/", auth, targetController.getTargetsByDateRange);

// Get all targets with user information (Admin API)
router.get("/admin/all", auth, adminAuth, targetController.getAllTargetsWithUsers);

// Get all weeks data for a specific user (Admin API)
router.get("/admin/user/:userId", auth, adminAuth, targetController.getUserAllWeeksData);

// Admin — set bulk targets for a specific user (coach assigns targets to members)
router.post("/admin/user/:userId/bulk", auth, adminAuth, targetController.adminBulkSetTargets);

// Admin — delete a specific target by id (any user)
router.delete("/admin/:id", auth, adminAuth, targetController.adminDeleteTarget);

module.exports = router;
