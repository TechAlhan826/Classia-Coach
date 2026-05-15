const Exercise = require('../models/Exercise');

// Get all exercises
exports.getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find({}).sort({ createdAt: -1 });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercises', error: error.message });
  }
};

// Get exercise by ID
exports.getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    res.json(exercise);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercise', error: error.message });
  }
};

// Get exercises by category
exports.getExercisesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const exercises = await Exercise.find({ category: category }).sort({ createdAt: -1 });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercises by category', error: error.message });
  }
};

// Add new exercise
exports.addExercise = async (req, res) => {
  try {
    const { category, exercise, method } = req.body;
    
    // Validate required fields
    if (!category || !exercise) {
      return res.status(400).json({ message: 'Category and exercise are required' });
    }

    const newExercise = new Exercise({
      category,
      exercise,
      method: method || ""
    });
    
    const savedExercise = await newExercise.save();
    res.status(201).json({ message: 'Exercise added successfully'});
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.exercise) {
      return res.status(400).json({ 
        message: 'Exercise with this name already exists',
        error: 'Duplicate exercise name'
      });
    }
    
    res.status(400).json({ message: 'Error adding exercise', error: error.message });
  }
};

// Update exercise by ID
exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedExercise = await Exercise.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedExercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    res.json({ message: 'Exercise updated successfully', exercise: updatedExercise });
  } catch (error) {
    res.status(400).json({ message: 'Error updating exercise', error: error.message });
  }
};

// Delete exercise by ID
exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedExercise = await Exercise.findByIdAndDelete(id);
    
    if (!deletedExercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting exercise', error: error.message });
  }
};

// Delete all exercises (use with caution)
exports.deleteAllExercises = async (req, res) => {
  try {
    const result = await Exercise.deleteMany({});
    res.json({ message: 'All exercises deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all exercises', error: error.message });
  }
};

// Get exercises for prompt - returns simplified format
exports.getExercisesForPrompt = async (req, res) => {
  try {
    const exercises = await Exercise.find({})
      .select('_id category exercise method')
      .sort({ createdAt: -1 });
    
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercises for prompt', error: error.message });
  }
};
  
  