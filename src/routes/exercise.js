const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');

// Get all exercises
router.get('/all', exerciseController.getAllExercises);

// Get exercises for prompt - simplified format
router.get('/for-prompt', exerciseController.getExercisesForPrompt);

// Get exercise by ID
router.get('/:id', exerciseController.getExerciseById);

// Get exercises by category
router.get('/category/:category', exerciseController.getExercisesByCategory);

// Add new exercise
router.post('/add', exerciseController.addExercise);

// Update exercise by ID
router.put('/update/:id', exerciseController.updateExercise);

// Delete exercise by ID
router.delete('/delete/:id', exerciseController.deleteExercise);

// Delete all exercises (use with caution)
router.delete('/delete-all', exerciseController.deleteAllExercises);

module.exports = router; 