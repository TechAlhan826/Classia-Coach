const mongoose = require('mongoose');

// Define Exercise Schema
const ExerciseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,  // Category is required
    trim: true
  },
  exercise: {
    type: String,
    required: true,  // Exercise name is required
    unique: true,    // Exercise name must be unique
    trim: true
  },
  icon: {
    type: String,
    default: "",     // Default empty string
    trim: true
  },
  color: {
    type: String,
    default: "",     // Default empty string
    trim: true
  },
  method: {
    type: String,
    default: "",     // Default empty if not provided
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model("Exercise", ExerciseSchema);

