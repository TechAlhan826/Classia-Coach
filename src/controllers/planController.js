const Target = require("../models/Target");
const Exercise = require("../models/Exercise");
const mongoose = require("mongoose");

// Get plan data with week summary and exercise details
exports.getPlan = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required." });
    }
    
    // Parse date strings to Date objects
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD format." });
    }
    
    // Set end date to end of day for inclusive range
    parsedEndDate.setHours(23, 59, 59, 999);
    
    // Get targets for the date range
    const targets = await Target.find({
      user_id: req.userId,
      date: { $gte: parsedStartDate, $lte: parsedEndDate },
      isDeleted: false,
    })
    .populate({
      path: 'exercises.id',
      select: '_id category exercise method color icon',
      model: 'Exercise'
    })
    .sort({ date: 1 });
    
    // Calculate week summary
    const weekSummary = {
      totalCarbs: 0,
      totalProtein: 0,
      totalFat: 0,
      totalSteps: 0,
      totalExerciseMinutes: 0
    };
    
    // Transform targets to weekPlan format
    const weekPlan = targets.map(target => {
      const targetObj = target.toObject();
      
      // Add to week summary
      weekSummary.totalCarbs += targetObj.carbs || 0;
      weekSummary.totalProtein += targetObj.protein || 0;
      weekSummary.totalFat += targetObj.fat || 0;
      weekSummary.totalSteps += targetObj.steps || 0;
      
      // Transform exercises array
      let exercises = [];
      if (targetObj.exercises && targetObj.exercises.length > 0) {
        exercises = targetObj.exercises.map(exercise => {
          if (exercise.id && typeof exercise.id === 'object') {
            // If populated, use the exercise details
            return {
              id: exercise.id._id.toString(),
              minutes: exercise.minutes,
              exercise: exercise.id.exercise,
              category: exercise.id.category,
              method: exercise.id.method,
              color: exercise.id.color,
              icon: exercise.id.icon
            };
          } else {
            // If not populated, return as is
            return {
              id: exercise.id.toString(),
              minutes: exercise.minutes,
              exercise: "Unknown Exercise",
              category: "Unknown",
              method: "",
              color: "#000000",
              icon: ""
            };
          }
        });
        
        // Add exercise minutes to week summary
        exercises.forEach(exercise => {
          weekSummary.totalExerciseMinutes += exercise.minutes || 0;
        });
      }
      
      // Calculate calories using the formula: (Protein × 4) + (Carbs × 4) + (Fat × 9)
      const calories = ((targetObj.protein || 0) * 4) + ((targetObj.carbs || 0) * 4) + ((targetObj.fat || 0) * 9);
      
      return {
        day: targetObj.day,
        date: targetObj.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        targets: {
          carbs: targetObj.carbs,
          protein: targetObj.protein,
          fat: targetObj.fat,
          steps: targetObj.steps,
          calories: calories,
          exerciseMinutes: exercises.reduce((total, ex) => total + (ex.minutes || 0), 0)
        },
        exercises: exercises,
        
      };
    });
    
    // Calculate exercise summary
    const exerciseMap = new Map();
    
    weekPlan.forEach(day => {
      day.exercises.forEach(exercise => {
        if (exerciseMap.has(exercise.id)) {
          exerciseMap.get(exercise.id).totalMinutes += exercise.minutes;
        } else {
          exerciseMap.set(exercise.id, {
            id: exercise.id,
            exercise: exercise.exercise,
            totalMinutes: exercise.minutes,
            category: exercise.category,
            method: exercise.method,
            color: exercise.color,
            icon: exercise.icon
          });
        }
      });
    });
    
    const exerciseSummary = Array.from(exerciseMap.values());
    
    const response = {
      weekSummary,
      weekPlan,
      exerciseSummary
    };
    
    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 