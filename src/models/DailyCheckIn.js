const mongoose = require('mongoose');

const dailyCheckInSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  weight_kg: { type: Number },
  weight_gram: { type: Number },
  date: { type: Date, default: Date.now },
  steps: { type: Number },
  protein: { type: Number },
  fat: { type: Number },
  carbs: { type: Number },
  calories: { type: Number },
  totalExercises: { type: Number, default: 0 }, // Updated from total_exercises
  totalMinutes: { type: Number, default: 0 }, // Updated from total_minutes
  exercise: [{ // Updated from exercises array of strings to array of objects
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    minutes: { type: Number, required: true }
  }],
  mood: { type: Number }, // Updated from Number to String
  energy: { type: Number }, // Updated from Number to String
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

dailyCheckInSchema.index({ user_id: 1, createdAt: 1 });

module.exports = mongoose.model('DailyCheckIn', dailyCheckInSchema); 