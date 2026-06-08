const DailyCheckIn = require('../models/DailyCheckIn');
const Exercise = require('../models/Exercise');

// Add Meal Macros — atomically increments protein/carbs/fat/calories for a specific day.
// Designed for the food scanner feature: safe to call multiple times per day (accumulates).
// Creates a minimal record if none exists for that date yet.
exports.addMealMacros = async (req, res) => {
  try {
    const user_id = req.userId;
    const { date, protein, carbs, fat } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'date is required (YYYY-MM-DD)' });
    }
    if (protein == null || carbs == null || fat == null) {
      return res.status(400).json({ message: 'protein, carbs and fat are required' });
    }

    const p = Math.max(0, parseInt(protein) || 0);
    const c = Math.max(0, parseInt(carbs)   || 0);
    const f = Math.max(0, parseInt(fat)     || 0);
    // Calorie math: 1g protein = 4 kcal, 1g carbs = 4 kcal, 1g fat = 9 kcal
    const addedCalories = (p * 4) + (c * 4) + (f * 9);

    // Use findOneAndUpdate with $inc for atomic accumulation.
    // setOnInsert provides safe defaults for required fields on first creation.
    const updated = await DailyCheckIn.findOneAndUpdate(
      { user_id, date },
      {
        $inc: {
          protein:  p,
          carbs:    c,
          fat:      f,
          calories: addedCalories,
        },
        $setOnInsert: {
          user_id,
          date,
          steps:         0,
          weight_kg:     0,
          weight_gram:   0,
          totalExercises: 0,
          totalMinutes:  0,
          exercise:      [],
          mood:          1,
          energy:        1,
          notes:         '',
          createdAt:     new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Meal macros added',
      protein: updated.protein,
      carbs:   updated.carbs,
      fat:     updated.fat,
      calories: updated.calories,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error adding meal macros', error: error.message });
  }
};

// Add Daily Check-In
exports.addCheckIn = async (req, res) => {
  try {
    const user_id = req.userId;
    const now = new Date();
    
    // Validate exercise array if provided
    if (req.body.exercise && Array.isArray(req.body.exercise)) {
      for (const exerciseItem of req.body.exercise) {
        if (!exerciseItem.id || !exerciseItem.minutes) {
          return res.status(400).json({ 
            message: 'Each exercise must have both id and minutes' 
          });
        }
        
        // Validate that exercise exists
        const exerciseExists = await Exercise.findById(exerciseItem.id);
        if (!exerciseExists) {
          return res.status(400).json({ 
            message: `Exercise with ID ${exerciseItem.id} not found` 
          });
        }
        
        // Validate minutes is a positive number
        if (typeof exerciseItem.minutes !== 'number' || exerciseItem.minutes <= 0) {
          return res.status(400).json({ 
            message: 'Minutes must be a positive number' 
          });
        }
      }
    }

    let checkIn = await DailyCheckIn.findOne({
      user_id,
      date: req.body.date
    });
    
    if (checkIn) {
      // Update existing, keep created_at
      const originalCreatedAt = checkIn.createdAt;
      
      Object.assign(checkIn, req.body);
      checkIn.createdAt = originalCreatedAt;
      checkIn.updatedAt = now;
      await checkIn.save();
      return res.status(200).json({ message: 'Check-in updated', checkIn });
    } else {
      // Create new
      checkIn = new DailyCheckIn({ ...req.body, user_id });
      await checkIn.save();
      return res.status(201).json({ message: 'Check-in added', checkIn });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error adding check-in', error: error.message });
  }
};

// Update Daily Check-In by ID
exports.updateCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.userId;
    
    // Validate exercise array if provided
    if (req.body.exercise && Array.isArray(req.body.exercise)) {
      for (const exerciseItem of req.body.exercise) {
        if (!exerciseItem.id || !exerciseItem.minutes) {
          return res.status(400).json({ 
            message: 'Each exercise must have both id and minutes' 
          });
        }
        
        // Validate that exercise exists
        const exerciseExists = await Exercise.findById(exerciseItem.id);
        if (!exerciseExists) {
          return res.status(400).json({ 
            message: `Exercise with ID ${exerciseItem.id} not found` 
          });
        }
        
        // Validate minutes is a positive number
        if (typeof exerciseItem.minutes !== 'number' || exerciseItem.minutes < 0) {
          return res.status(400).json({ 
            message: 'Minutes must be a positive number' 
          });
        }
      }
    }
    
    const checkIn = await DailyCheckIn.findOneAndUpdate(
      { _id: id, user_id },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!checkIn) return res.status(404).json({ message: 'Check-in not found' });
    res.json({ message: 'Check-in updated', checkIn });
  } catch (error) {
    res.status(400).json({ message: 'Error updating check-in', error: error.message });
  }
};

// Delete Daily Check-In by ID
exports.deleteCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.userId;
    const checkIn = await DailyCheckIn.findOneAndDelete({ _id: id, user_id });
    if (!checkIn) return res.status(404).json({ message: 'Check-in not found' });
    res.json({ message: 'Check-in deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting check-in', error: error.message });
  }
};

// Get Daily Check-In by Date (ignoring time)
exports.getCheckInByDate = async (req, res) => {
  try {
    const user_id = req.userId;
    const { date } = req.query; // expects 'YYYY-MM-DD' string
    if (!date) return res.status(400).json({ message: 'Date is required' });
    // Parse date as YYYY-MM-DD and ignore time
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    const checkIn = await DailyCheckIn.findOne({
      user_id,
      createdAt: { $gte: start, $lte: end }
    }).populate('exercise.id', 'category exercise method icon color'); // Populate exercise details
    
    if (!checkIn) return res.status(404).json({ message: 'Check-in not found for this date' });
    
    // Transform exercise array to flatten the structure
    const transformedCheckIn = checkIn.toObject();
    if (transformedCheckIn.exercise && Array.isArray(transformedCheckIn.exercise)) {
      transformedCheckIn.exercise = transformedCheckIn.exercise.map(exerciseItem => ({
        _id: exerciseItem.id._id,
        category: exerciseItem.id.category,
        exercise: exerciseItem.id.exercise,
        color: exerciseItem.id.color,
        icon: exerciseItem.id.icon,
        method: exerciseItem.id.method,
        minutes: exerciseItem.minutes
      }));
    }
    
    res.json(transformedCheckIn);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching check-in', error: error.message });
  }
};

// Get Daily Check-Ins by date range (ASC order)
exports.getCheckInsByDateRange = async (req, res) => {
  try {
    const user_id = req.userId;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'startDate and endDate are required' });
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ message: 'Invalid date format' });
    // Set end to end of day
    end.setHours(23,59,59,999);
    const checkIns = await DailyCheckIn.find({
      user_id,
      createdAt: { $gte: start, $lte: end }
    }).populate('exercise.id', 'category exercise method icon color').sort({ createdAt: 1 }); // Populate exercise details
    
    // Transform exercise arrays to flatten the structure
    const transformedCheckIns = checkIns.map(checkIn => {
      const transformedCheckIn = checkIn.toObject();
      if (transformedCheckIn.exercise && Array.isArray(transformedCheckIn.exercise)) {
        transformedCheckIn.exercise = transformedCheckIn.exercise.map(exerciseItem => ({
          _id: exerciseItem.id._id,
          category: exerciseItem.id.category,
          exercise: exerciseItem.id.exercise,
          method: exerciseItem.id.method,
          color: exerciseItem.id.color,
          icon: exerciseItem.id.icon,
          minutes: exerciseItem.minutes
        }));
      }
      return transformedCheckIn;
    });
    
    res.json(transformedCheckIns);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching check-ins', error: error.message });
  }
}; 

// Get all daily check-ins with user information (Admin API)
exports.getAllCheckInsWithUsers = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50,
      userId,
      search,
      mood,
      energy,
      minWeight,
      maxWeight,
      minSteps,
      maxSteps,
      minCalories,
      maxCalories,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Date range filter
    if (startDate && endDate) {
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format." 
        });
      }
      
      // Set end date to end of day for inclusive range
      parsedEndDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: parsedStartDate, $lte: parsedEndDate };
    }
    
    // User filter
    if (userId) {
      filter.user_id = userId;
    }
    
    // Search filter (search in user_id, notes)
    if (search) {
      // First, get all users to search by name
      const User = require('../models/User');
      const allUsers = await User.find({})
        .select('_id name email user_id loginType createdAt')
        .lean();
      
      // Find users whose names match the search term
      const matchingUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.user_id.toLowerCase().includes(search.toLowerCase())
      );
      
      // Get user IDs from matching users
      const matchingUserIds = matchingUsers.map(user => user.user_id);
      
      // Build search filter
      filter.$or = [
        { user_id: { $in: matchingUserIds } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Mood filter
    if (mood !== undefined && mood !== '') {
      filter.mood = parseInt(mood);
    }
    
    // Energy filter
    if (energy !== undefined && energy !== '') {
      filter.energy = parseInt(energy);
    }
    
    // Weight range filter
    if (minWeight !== undefined && minWeight !== '') {
      filter.weight_kg = { ...filter.weight_kg, $gte: parseFloat(minWeight) };
    }
    if (maxWeight !== undefined && maxWeight !== '') {
      filter.weight_kg = { ...filter.weight_kg, $lte: parseFloat(maxWeight) };
    }
    
    // Steps range filter
    if (minSteps !== undefined && minSteps !== '') {
      filter.steps = { ...filter.steps, $gte: parseInt(minSteps) };
    }
    if (maxSteps !== undefined && maxSteps !== '') {
      filter.steps = { ...filter.steps, $lte: parseInt(maxSteps) };
    }
    
    // Calories range filter
    if (minCalories !== undefined && minCalories !== '') {
      filter.calories = { ...filter.calories, $gte: parseInt(minCalories) };
    }
    if (maxCalories !== undefined && maxCalories !== '') {
      filter.calories = { ...filter.calories, $lte: parseInt(maxCalories) };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalCount = await DailyCheckIn.countDocuments(filter);
    
    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get check-ins with pagination
    const checkIns = await DailyCheckIn.find(filter)
      .populate({
        path: 'exercise.id',
        select: '_id category exercise method color icon',
        model: 'Exercise'
      })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get unique user IDs from check-ins
    const userIds = [...new Set(checkIns.map(checkIn => checkIn.user_id))];
    
    // Get user information for all users
    const User = require('../models/User');
    const users = await User.find({ user_id: { $in: userIds } })
      .select('_id name email user_id loginType createdAt')
      .lean();
    
    // Create user lookup map
    const userMap = users.reduce((map, user) => {
      map[user.user_id] = user;
      return map;
    }, {});
    
    // Transform check-ins to include user information
    const transformedCheckIns = checkIns.map(checkIn => {
      const checkInObj = checkIn.toObject();
      const user = userMap[checkIn.user_id];
      
      // Add user information
      checkInObj.user = user ? {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_id: user.user_id,
        loginType: user.loginType,
        createdAt: user.createdAt
      } : null;
      
      // Transform exercise array
      if (checkInObj.exercise && checkInObj.exercise.length > 0) {
        checkInObj.exercise = checkInObj.exercise.map(exerciseItem => {
          if (exerciseItem.id && typeof exerciseItem.id === 'object') {
            return {
              _id: exerciseItem.id._id,
              category: exerciseItem.id.category,
              exercise: exerciseItem.id.exercise,
              method: exerciseItem.id.method,
              color: exerciseItem.id.color,
              icon: exerciseItem.id.icon,
              minutes: exerciseItem.minutes
            };
          } else {
            return exerciseItem;
          }
        });
      }
      
      // Add date information
      const checkInDate = new Date(checkInObj.createdAt);
      checkInObj.dateInfo = {
        date: checkInDate.toISOString().split('T')[0],
        dayOfWeek: checkInDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekShort: checkInDate.toLocaleDateString('en-US', { weekday: 'short' }),
        month: checkInDate.toLocaleDateString('en-US', { month: 'long' }),
        monthShort: checkInDate.toLocaleDateString('en-US', { month: 'short' }),
        year: checkInDate.getFullYear()
      };
      
      // Calculate total weight in kg
      checkInObj.totalWeightKg = (checkInObj.weight_kg || 0) + ((checkInObj.weight_gram || 0) / 1000);
      
      return checkInObj;
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    // Calculate summary statistics
    const summary = {
      totalCheckIns: totalCount,
      totalUsers: userIds.length,
      avgWeight: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.totalWeightKg || 0), 0) / transformedCheckIns.length * 1000) / 1000 : 0,
      avgSteps: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.steps || 0), 0) / transformedCheckIns.length) : 0,
      avgCalories: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.calories || 0), 0) / transformedCheckIns.length) : 0,
      avgProtein: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.protein || 0), 0) / transformedCheckIns.length) : 0,
      avgFat: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.fat || 0), 0) / transformedCheckIns.length) : 0,
      avgCarbs: transformedCheckIns.length > 0 ? 
        Math.round(transformedCheckIns.reduce((sum, ci) => sum + (ci.carbs || 0), 0) / transformedCheckIns.length) : 0,
      totalExercises: transformedCheckIns.reduce((sum, ci) => sum + (ci.totalExercises || 0), 0),
      totalMinutes: transformedCheckIns.reduce((sum, ci) => sum + (ci.totalMinutes || 0), 0)
    };
    
    res.status(200).json({
      success: true,
      message: "Daily check-ins retrieved successfully",
      data: {
        checkIns: transformedCheckIns,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage,
          hasPrevPage
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          userId: userId || null,
          search: search || null,
          mood: mood || null,
          energy: energy || null,
          minWeight: minWeight || null,
          maxWeight: maxWeight || null,
          minSteps: minSteps || null,
          maxSteps: maxSteps || null,
          minCalories: minCalories || null,
          maxCalories: maxCalories || null,
          sortBy,
          sortOrder
        },
        summary
      }
    });
    
  } catch (err) {
    console.error('Error in getAllCheckInsWithUsers:', err);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: err.message 
    });
  }
}; 

// Get dashboard statistics (Admin API)
exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date and week information
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Calculate current week (Monday to Sunday)
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to go back to Monday
    currentWeekStart.setDate(today.getDate() - daysToMonday);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    // Get all required models
    const User = require('../models/User');
    const Target = require('../models/Target');
    const Exercise = require('../models/Exercise');
    
    // 1. Get total users count
    const totalUsers = await User.countDocuments({});
    
    // 2. Get total targets count
    const totalTargets = await Target.countDocuments({ isDeleted: false });
    
    // 3. Get current week targets count (user-wise, Monday to Sunday)
    const currentWeekTargets = await Target.find({
      date: { $gte: currentWeekStart, $lte: currentWeekEnd },
      isDeleted: false
    });
    
    // Group targets by user for current week
    const currentWeekUserTargets = currentWeekTargets.reduce((users, target) => {
      if (!users[target.user_id]) {
        users[target.user_id] = 0;
      }
      users[target.user_id]++;
      return users;
    }, {});
    
    const currentWeekUsersCount = Object.keys(currentWeekUserTargets).length;
    const currentWeekTotalTargets = currentWeekTargets.length;
    
    // 4. Get today's daily check-ins count
    const todaysCheckIns = await DailyCheckIn.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // 5. Get total exercises count
    const totalExercises = await Exercise.countDocuments({});
    
    // 6. Get additional statistics for current week
    const currentWeekStats = {
      weekStart: currentWeekStart.toISOString().split('T')[0],
      weekEnd: currentWeekEnd.toISOString().split('T')[0],
      totalUsers: currentWeekUsersCount,
      totalTargets: currentWeekTotalTargets,
      userBreakdown: currentWeekUserTargets
    };
    
    // 7. Get today's statistics
    const todaysStats = {
      date: today.toISOString().split('T')[0],
      dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
      checkInsCount: todaysCheckIns
    };
    
    // 8. Get recent activity (last 7 days)
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekCheckIns = await DailyCheckIn.countDocuments({
      createdAt: { $gte: lastWeekStart, $lt: tomorrow }
    });
    
    const lastWeekTargets = await Target.countDocuments({
      date: { $gte: lastWeekStart, $lt: tomorrow },
      isDeleted: false
    });
    
    // 9. Get user growth (users created in last 30 days)
    const lastMonthStart = new Date(today);
    lastMonthStart.setDate(lastMonthStart.getDate() - 30);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: tomorrow }
    });
    
    // 10. Get top performing users (users with most targets this week)
    const topUsersSorted = Object.entries(currentWeekUserTargets)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Enrich with real names via a single query (no N+1)
    const topUserIds = topUsersSorted.map(([uid]) => uid);
    const topUserDocs = await User.find(
      { user_id: { $in: topUserIds } },
      { user_id: 1, name: 1, email: 1 }
    ).lean();

    const userNameMap = topUserDocs.reduce((acc, u) => {
      acc[u.user_id] = { name: u.name, email: u.email };
      return acc;
    }, {});

    const topUsersThisWeek = topUsersSorted.map(([userId, targetCount]) => ({
      userId,
      name:  userNameMap[userId]?.name  || 'Unknown',
      email: userNameMap[userId]?.email || '',
      targetCount
    }));
    
    // 11. Get weekly trend data (last 4 weeks)
    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekTargets = await Target.countDocuments({
        date: { $gte: weekStart, $lte: weekEnd },
        isDeleted: false
      });
      
      const weekCheckIns = await DailyCheckIn.countDocuments({
        createdAt: { $gte: weekStart, $lte: weekEnd }
      });
      
      weeklyTrends.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        targets: weekTargets,
        checkIns: weekCheckIns
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: {
        overview: {
          totalUsers,
          totalTargets,
          totalExercises,
          currentWeekUsers: currentWeekUsersCount,
          currentWeekTargets: currentWeekTotalTargets,
          todaysCheckIns
        },
        currentWeek: currentWeekStats,
        today: todaysStats,
        recentActivity: {
          last7Days: {
            checkIns: lastWeekCheckIns,
            targets: lastWeekTargets
          },
          last30Days: {
            newUsers: newUsersThisMonth
          }
        },
        topPerformers: {
          thisWeek: topUsersThisWeek
        },
        weeklyTrends,
        lastUpdated: now.toISOString()
      }
    });
    
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: err.message 
    });
  }
}; 