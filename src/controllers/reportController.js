const DailyCheckIn = require('../models/DailyCheckIn');
const Target = require('../models/Target');

// ── Weekly report ─────────────────────────────────────────────────────────────
// Root cause of date mismatch: DailyCheckIn.date is stored as a Date (UTC).
// The app stores it as YYYY-MM-DD string via date: req.body.date, so Mongoose
// casts "2026-06-09" → new Date("2026-06-09") = 2026-06-09T00:00:00.000Z (UTC).
// We query and match using the same UTC-aligned day boundaries.
exports.generateWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user_id = req.userId;

    if (!startDate || !endDate)
      return res.status(400).json({ message: 'startDate and endDate are required' });

    // Align to UTC day boundaries (matches how the app stores dates)
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end   = new Date(endDate   + 'T23:59:59.999Z');

    if (isNaN(start.getTime()) || isNaN(end.getTime()))
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD format.' });

    if (start > end)
      return res.status(400).json({ message: 'Start date must be before or equal to end date' });

    // Fetch check-ins WITHIN the date range (not all-time) — fixes the performance bug
    const dailyCheckIns = await DailyCheckIn.find({
      user_id,
      date: { $gte: start, $lte: end }
    })
      .populate('exercise.id', 'category exercise method icon color')
      .sort({ date: 1 })
      .lean();

    // Build a map keyed by YYYY-MM-DD (UTC) for O(1) lookup
    const checkInMap = new Map();
    dailyCheckIns.forEach(ci => {
      // ci.date stored as 2026-06-09T00:00:00.000Z → split gives "2026-06-09"
      const key = new Date(ci.date).toISOString().split('T')[0];
      checkInMap.set(key, ci);
    });

    // Fetch targets within range
    const targets = await Target.find({
      user_id,
      date: { $gte: start, $lte: end },
      isDeleted: false
    })
      .populate('exercises.id', 'category exercise method icon color')
      .sort({ date: 1 })
      .lean();

    const targetMap = new Map();
    targets.forEach(t => {
      const key = new Date(t.date).toISOString().split('T')[0];
      targetMap.set(key, t);
    });

    // Generate every date in range
    const allDates = [];
    const cur = new Date(start);
    while (cur <= end) {
      allDates.push(cur.toISOString().split('T')[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    // Accumulators
    let totalSteps = 0, totalCalories = 0, totalExerciseMinutes = 0;
    let totalProtein = 0, totalFat = 0, totalCarbs = 0;
    let moodSum = 0, energySum = 0, moodCount = 0, energyCount = 0;
    let startWeight = null, endWeight = null;

    const stepsChart = [], nutritionChart = [], dailyReports = [];

    allDates.forEach(dateKey => {
      const checkIn = checkInMap.get(dateKey) || null;
      const target  = targetMap.get(dateKey)  || null;

      // Target values
      const targetSteps           = target?.steps    || 0;
      const targetProtein         = target?.protein  || 0;
      const targetFat             = target?.fat      || 0;
      const targetCarbs           = target?.carbs    || 0;
      const targetCalories        = (targetProtein * 4) + (targetFat * 9) + (targetCarbs * 4);
      const targetExerciseMinutes = target
        ? (target.exercises || []).reduce((s, e) => s + (e.minutes || 0), 0)
        : 0;

      // Achieved values
      const achievedSteps           = checkIn?.steps         || 0;
      const achievedCalories        = checkIn?.calories      || 0;
      const achievedProtein         = checkIn?.protein       || 0;
      const achievedFat             = checkIn?.fat           || 0;
      const achievedCarbs           = checkIn?.carbs         || 0;
      const achievedExerciseMinutes = checkIn?.totalMinutes  || 0;
      const mood                    = checkIn?.mood   ?? null;
      const energy                  = checkIn?.energy ?? null;

      // Weight
      let totalWeight = null;
      if (checkIn && (checkIn.weight_kg || checkIn.weight_gram)) {
        totalWeight = (checkIn.weight_kg || 0) + ((checkIn.weight_gram || 0) / 1000);
      }

      // Exercise breakdown
      const targetExercises  = target?.exercises || [];
      const achievedExercises = checkIn?.exercise || [];

      const targetExMap   = new Map(targetExercises.map(ex => [ex.id?._id?.toString(), ex]));
      const achievedExMap = new Map(achievedExercises.map(ex => [ex.id?._id?.toString(), ex.minutes]));
      const allExIds      = new Set([...targetExMap.keys(), ...achievedExMap.keys()].filter(Boolean));

      const exercises = [];
      allExIds.forEach(id => {
        const tEx    = targetExMap.get(id);
        const achMin = achievedExMap.get(id) || 0;
        const details = tEx?.id || achievedExercises.find(e => e.id?._id?.toString() === id)?.id;
        if (details) {
          exercises.push({
            _id:             id,
            category:        details.category,
            exercise:        details.exercise,
            method:          details.method,
            target_day:      dateKey,
            target_minutes:  tEx?.minutes   || 0,
            achieved_minutes: achMin
          });
        }
      });

      // Accumulate
      totalSteps           += achievedSteps;
      totalCalories        += achievedCalories;
      totalExerciseMinutes += achievedExerciseMinutes;
      totalProtein         += achievedProtein;
      totalFat             += achievedFat;
      totalCarbs           += achievedCarbs;

      if (mood   !== null) { moodSum   += mood;   moodCount++;   }
      if (energy !== null) { energySum += energy; energyCount++; }

      if (totalWeight !== null) {
        if (startWeight === null) startWeight = totalWeight;
        endWeight = totalWeight;
      }

      stepsChart.push({ date: dateKey, achieved: achievedSteps, target: targetSteps });
      nutritionChart.push({
        date:    dateKey,
        protein: { achieved: achievedProtein, target: targetProtein },
        fat:     { achieved: achievedFat,     target: targetFat     },
        carbs:   { achieved: achievedCarbs,   target: targetCarbs   }
      });
      dailyReports.push({
        date:            dateKey,
        weightKg:        totalWeight,
        steps:           { achieved: achievedSteps,           target: targetSteps           },
        calories:        { achieved: achievedCalories,        target: targetCalories        },
        protein:         { achieved: achievedProtein,         target: targetProtein         },
        fat:             { achieved: achievedFat,             target: targetFat             },
        carbs:           { achieved: achievedCarbs,           target: targetCarbs           },
        exerciseMinutes: { achieved: achievedExerciseMinutes, target: targetExerciseMinutes },
        mood,
        energy,
        notes:     checkIn?.notes    || '',
        exercises
      });
    });

    // Weekly target totals via aggregation
    const weeklyTargets = await Target.aggregate([
      { $match: { user_id, date: { $gte: start, $lte: end }, isDeleted: false } },
      { $group: {
          _id:                  null,
          totalSteps:           { $sum: '$steps'   },
          totalProtein:         { $sum: '$protein' },
          totalFat:             { $sum: '$fat'     },
          totalCarbs:           { $sum: '$carbs'   },
          totalExerciseMinutes: { $sum: { $sum: '$exercises.minutes' } }
      }}
    ]);

    const wt = weeklyTargets[0] || {};
    const weeklyCaloriesTarget = ((wt.totalProtein || 0) * 4) + ((wt.totalFat || 0) * 9) + ((wt.totalCarbs || 0) * 4);

    res.status(200).json({
      status: 'success',
      weekRange: { startDate, endDate },
      summary: {
        steps:           { achieved: totalSteps,           target: wt.totalSteps           || 0 },
        calories:        { achieved: totalCalories,        target: weeklyCaloriesTarget         },
        exerciseMinutes: { achieved: totalExerciseMinutes, target: wt.totalExerciseMinutes || 0 },
        protein:         { achieved: totalProtein,         target: wt.totalProtein         || 0 },
        fat:             { achieved: totalFat,             target: wt.totalFat             || 0 },
        carbs:           { achieved: totalCarbs,           target: wt.totalCarbs           || 0 },
        moodAvg:   moodCount   > 0 ? Math.round(moodSum   / moodCount)   : 0,
        energyAvg: energyCount > 0 ? Math.round(energySum / energyCount) : 0,
        weightChange: { start: startWeight, end: endWeight }
      },
      charts:       { steps: stepsChart, nutrition: nutritionChart },
      dailyReports
    });

  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ message: 'Error generating weekly report', error: error.message });
  }
};