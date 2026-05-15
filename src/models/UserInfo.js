const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true, unique: true},
  country: { type: String },
  gender: { type: String },
  dob: { type: Date },
  weight_kg: { type: Number },
  weight_gram: { type: Number },
  height_feet: { type: Number },
  height_inches: { type: Number },
  activity_level: { type: String },
  goal: { type: String },
  secondary_goal: { type: [String] },
  target_weight_kg: { type: Number },
  target_weight_gram: { type: Number },
  goal_achieve_date: { type: Date },
  goal_achieve_time: { type: String },
  dietary_preference: { type: [String] },
  specify_allergy: { type: String },
  food_allergy: { type: [String] },
  other_food_preference: { type: String },
  strength_training: { type: Number },
  cardio_exercise: { type: Number },
  calorie_intake: { type: Number },
  meals_per_day: { type: Number },
  dieting_experience: { type: String },
  medical_condition: { type: [String] },
  medical_condition_note: { type: String },
  note: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserInfo', userInfoSchema); 