const mongoose = require("mongoose");

// Exercise Subdocument Schema
const ExerciseItemSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  minutes: { type: Number, required: true },
  total_sessions: { type: Number, required: true }
}, { _id: false });

const TargetSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  date: { type: Date, required: true },
  day: { type: String, required: true },
  steps: { type: Number, required: true },
  protein: { type: Number, required: true },
  fat: { type: Number, required: true },
  carbs: { type: Number, required: true },
  exercises: { type: [ExerciseItemSchema], default: [] },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Unique index on user_id and date combination
// This ensures one target per user per date
TargetSchema.index({ user_id: 1, date: 1 }, { 
  unique: true,
  name: 'user_id_1_date_1' // Explicit name to avoid conflicts
});

// Update updatedAt before save
TargetSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Target", TargetSchema);
