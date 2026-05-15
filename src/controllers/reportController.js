const DailyCheckIn = require('../models/DailyCheckIn');
const Target = require('../models/Target');

// Generate weekly report
exports.generateWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user_id = req.userId;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'startDate and endDate are required' 
      });
    }

    // Parse dates and ensure proper format
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD format.' 
      });
    }

    // Validate that start date is before or equal to end date
    if (start > end) {
      return res.status(400).json({
        message: 'Start date must be before or equal to end date' 
      });
    }

    // Get daily check-ins for the date range
    // Use a broader query to get all check-ins and filter by date later
    const dailyCheckIns = await DailyCheckIn.find({
      user_id
    }).populate('exercise.id', 'category exercise method icon color')
    .sort({ date: 1 });

    // Get targets for the date range
    const targets = await Target.find({
      user_id: user_id,
      date: { $gte: start, $lte: end },
      isDeleted: false
    }).populate('exercises.id', 'category exercise method icon color')
    .sort({ date: 1 });


    // Create a map of targets by date for easy lookup
    const targetMap = new Map();
    targets.forEach(target => {
      const dateKey = target.date.toISOString().split('T')[0];
      targetMap.set(dateKey, target);
    });

    // Generate all dates in the range
    const allDates = [];
    const currentDate = new Date(start);
    const endDateForLoop = new Date(end);
    
    while (currentDate <= endDateForLoop) {
      allDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Initialize summary variables
    let totalSteps = 0;
    let totalCalories = 0;
    let totalExerciseMinutes = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;
    let moodSum = 0;
    let energySum = 0;
    let moodCount = 0;
    let energyCount = 0;
    let startWeight = 0;
    let endWeight = 0;

    // Initialize charts data
    const stepsChart = [];
    const nutritionChart = [];
    const dailyReports = [];

    // Process each date
    allDates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      
      // Find check-in for this date by comparing date strings
      const checkIn = dailyCheckIns.find(ci => {
        // Handle both Date objects and string dates
        let checkInDate;
        if (ci.date instanceof Date) {
          checkInDate = ci.date.toISOString().split('T')[0];
        } else {
          // If date is stored as string, use it directly
          checkInDate = ci.date.split('T')[0];
        }
        return checkInDate === dateKey;
      });
      
      const target = targetMap.get(dateKey);

             // Get target values (default to 0 if no target)
       const targetSteps = target ? target.steps : 0;
       const targetProtein = target ? target.protein : 0;
       const targetFat = target ? target.fat : 0;
       const targetCarbs = target ? target.carbs : 0;
       const targetCalories =(targetProtein * 4) + (targetFat * 9) + (targetCarbs * 4);
       
       const targetExerciseMinutes = target ? target.exercises.reduce((total, exercise) => total + exercise.minutes, 0) : 0;

      // Get achieved values
      const achievedSteps = checkIn ? (checkIn.steps || 0) : 0;
      const achievedCalories = checkIn ? (checkIn.calories || 0) : 0;
      const achievedProtein = checkIn ? (checkIn.protein || 0) : 0;
      const achievedFat = checkIn ? (checkIn.fat || 0) : 0;
      const achievedCarbs = checkIn ? (checkIn.carbs || 0) : 0;
      const achievedExerciseMinutes = checkIn ? (checkIn.totalMinutes || 0) : 0;
      const mood = checkIn ? checkIn.mood : 1;
      const energy = checkIn ? checkIn.energy : 1;
      
      // Calculate total weight including grams
      let totalWeight = null;
      if (checkIn) {
        const weightKg = checkIn.weight_kg || 0;
        const weightGram = checkIn.weight_gram || 0;
        totalWeight = weightKg + (weightGram / 1000);
      }

      // Process exercises for this day
      const exercises = [];
      
      // Get target exercises for this day
      const targetExercises = target ? target.exercises : [];
      const targetExerciseMap = new Map();
      targetExercises.forEach(ex => {
        targetExerciseMap.set(ex.id._id.toString(), {
          target_minutes: ex.minutes,
          total_sessions: ex.total_sessions
        });
      });

      // Get achieved exercises for this day
      const achievedExercises = checkIn ? checkIn.exercise : [];
      const achievedExerciseMap = new Map();
      achievedExercises.forEach(ex => {
        achievedExerciseMap.set(ex.id._id.toString(), ex.minutes);
      });

      // Combine target and achieved exercises
      const allExerciseIds = new Set([
        ...targetExerciseMap.keys(),
        ...achievedExerciseMap.keys()
      ]);

      allExerciseIds.forEach(exerciseId => {
        const targetData = targetExerciseMap.get(exerciseId);
        const achievedMinutes = achievedExerciseMap.get(exerciseId) || 0;
        
        // Find the exercise details from either target or achieved exercises
        let exerciseDetails = null;
        
        // Try to find in target exercises first
        const targetExercise = targetExercises.find(ex => ex.id._id.toString() === exerciseId);
        if (targetExercise) {
          exerciseDetails = targetExercise.id;
        } else {
          // Try to find in achieved exercises
          const achievedExercise = achievedExercises.find(ex => ex.id._id.toString() === exerciseId);
          if (achievedExercise) {
            exerciseDetails = achievedExercise.id;
          }
        }

        if (exerciseDetails) {
          exercises.push({
            "_id": exerciseId,
            "category": exerciseDetails.category,
            "target_day": dateKey,
            "exercise": exerciseDetails.exercise,
            "method": exerciseDetails.method,
            "target_minutes": targetData ? targetData.target_minutes : 0,
            "achieved_minutes": achievedMinutes
          });
        }
      });

      // Update summary totals
      totalSteps += achievedSteps;
      totalCalories += achievedCalories;
      totalExerciseMinutes += achievedExerciseMinutes;
      totalProtein += achievedProtein;
      totalFat += achievedFat;
      totalCarbs += achievedCarbs;

      if (mood !== null) {
        moodSum += mood;
        moodCount++;
      }
      if (energy !== null) {
        energySum += energy;
        energyCount++;
      }

      // Track weight for first and last day
      if (totalWeight !== null) {
        if (startWeight === null) startWeight = totalWeight;
        endWeight = totalWeight;
      }

      // Add to charts
      stepsChart.push({
        date: dateKey,
        achieved: achievedSteps,
        target: targetSteps
      });

      nutritionChart.push({
        date: dateKey,
        protein: { achieved: achievedProtein, target: targetProtein },
        fat: { achieved: achievedFat, target: targetFat },
        carbs: { achieved: achievedCarbs, target: targetCarbs }
      });

      // Add to daily reports
      dailyReports.push({
        date: dateKey,
        weightKg: totalWeight,
        steps: { achieved: achievedSteps, target: targetSteps },
        calories: { achieved: achievedCalories, target: targetCalories },
        protein: { achieved: achievedProtein, target: targetProtein },
        fat: { achieved: achievedFat, target: targetFat },
        carbs: { achieved: achievedCarbs, target: targetCarbs },
        exerciseMinutes: { achieved: achievedExerciseMinutes, target: targetExerciseMinutes },
        mood: mood,
        energy: energy,
        notes: checkIn ? (checkIn.notes || '') : '',
        exercises: exercises
      });
    });

    // Calculate averages
    const moodAvg = moodCount > 0 ? Math.round(moodSum / moodCount): 0;
    const energyAvg = energyCount > 0 ? Math.round(energySum / energyCount) : 0;

    // Calculate weekly targets (7 days)
    const weeklyTargets = await Target.aggregate([
      {
        $match: {
          user_id: user_id,
          date: { $gte: start, $lte: end },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalSteps: { $sum: "$steps" },
          totalProtein: { $sum: "$protein" },
          totalFat: { $sum: "$fat" },
          totalCarbs: { $sum: "$carbs" },
          totalExerciseMinutes: { $sum: { $sum: "$exercises.minutes" } }
        }
      }
    ]);

    const weeklyStepsTarget = weeklyTargets.length > 0 ? weeklyTargets[0].totalSteps : 0;
    const weeklyProteinTarget = weeklyTargets.length > 0 ? weeklyTargets[0].totalProtein : 0;
    const weeklyFatTarget = weeklyTargets.length > 0 ? weeklyTargets[0].totalFat : 0;
    const weeklyCarbsTarget = weeklyTargets.length > 0 ? weeklyTargets[0].totalCarbs : 0;
    const weeklyExerciseMinutesTarget = weeklyTargets.length > 0 ? weeklyTargets[0].totalExerciseMinutes : 0;
    const weeklyCaloriesTarget = (weeklyProteinTarget * 4) + (weeklyFatTarget * 9) + (weeklyCarbsTarget * 4);

    // Prepare response
    const response = {
      status: "success",
      weekRange: {
        startDate: startDate,
        endDate: endDate
      },
      summary: {
        steps: { 
          achieved: totalSteps, 
          target: weeklyStepsTarget 
        },
        calories: { 
          achieved: totalCalories, 
          target: weeklyCaloriesTarget 
        },
        exerciseMinutes: { 
          achieved: totalExerciseMinutes, 
          target: weeklyExerciseMinutesTarget 
        },
        protein: { 
          achieved: totalProtein, 
          target: weeklyProteinTarget 
        },
        fat: { 
          achieved: totalFat, 
          target: weeklyFatTarget 
        },
        carbs: { 
          achieved: totalCarbs, 
          target: weeklyCarbsTarget 
        },
        moodAvg: moodAvg,
        energyAvg: energyAvg,
        weightChange: {
          start: startWeight,
          end: endWeight
        }
      },
      charts: {
        steps: stepsChart,
        nutrition: nutritionChart
      },
      dailyReports: dailyReports
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ 
      message: 'Error generating weekly report', 
      error: error.message 
    });
  }
}; 