const Target = require("../models/Target");
const mongoose = require("mongoose");

// Bulk add or update targets by date
exports.bulkUpsertTargets = async (req, res) => {
  try {
    const targets = req.body;
    const userId = req.userId; // Get user_id from auth middleware
    
    if (!Array.isArray(targets)) {
      return res.status(400).json({ message: "Input should be an array." });
    }
    
    const bulkOps = targets.map((target) => {
      // Parse date string to Date object
      const parsedDate = new Date(target.date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${target.date}`);
      }
      
      return {
        updateOne: {
          filter: { user_id: userId, date: parsedDate },
          update: {
            $set: { 
              ...target, 
              user_id: userId,
              date: parsedDate,
              updatedAt: new Date(), 
              isDeleted: false 
            },
          },
          upsert: true,
        },
      };
    });
    
    const result = await Target.bulkWrite(bulkOps);
    res.status(200).json({ 
      message: "Targets added/updated successfully.",
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount
    });
  } catch (err) {
    // Handle duplicate key errors specifically
    if (err.code === 11000) {
      console.error('Duplicate key error:', err.message);
      return res.status(409).json({ 
        message: "Duplicate target detected. Each user can only have one target per date.",
        error: "Duplicate key error",
        details: err.message
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// Update a target by id
exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // Get user_id from auth middleware
    
    const updated = await Target.findOneAndUpdate(
      { _id: id, user_id: userId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Target not found." });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Soft delete a target by id
exports.deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // Get user_id from auth middleware
    
    const deleted = await Target.findOneAndUpdate(
      { _id: id, user_id: userId },
      { isDeleted: true, updatedAt: new Date() },
      { new: true }
    );
    if (!deleted) return res.status(404).json({ message: "Target not found." });
    res.status(200).json({ message: "Target deleted (soft)." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get targets by date range
exports.getTargetsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.userId; // Get user_id from auth middleware
    
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
    
    const targets = await Target.find({
      user_id: userId,
      date: { $gte: parsedStartDate, $lte: parsedEndDate },
      isDeleted: false,
    })
    .populate({
      path: 'exercises.id',
      select: '_id category exercise method color icon',
      model: 'Exercise'
    })
    .sort({ date: 1 });
    
    // Transform the response to match the desired format
    const transformedTargets = targets.map(target => {
      const targetObj = target.toObject();
      
      // Transform exercises array to include full exercise details
      if (targetObj.exercises && targetObj.exercises.length > 0) {
        targetObj.exercises = targetObj.exercises.map(exercise => {
          if (exercise.id && typeof exercise.id === 'object') {
            // If populated, use the exercise details
            return {
              _id: exercise.id._id,
              category: exercise.id.category,
              exercise: exercise.id.exercise,
              method: exercise.id.method,
              color: exercise.id.color,
              icon: exercise.id.icon,
              minutes: exercise.minutes,
              total_sessions: exercise.total_sessions
            };
          } else {
            // If not populated, return as is
            return exercise;
          }
        });
      }
      
      return targetObj;
    });
    
    res.status(200).json(transformedTargets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all targets with user information (Admin API)
exports.getAllTargetsWithUsers = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50,
      userId,
      search 
    } = req.query;
    
    // Build filter object
    let filter = { isDeleted: false };
    
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
      filter.date = { $gte: parsedStartDate, $lte: parsedEndDate };
    }
    
    // User filter
    if (userId) {
      filter.user_id = userId;
    }
    
    // Search filter (search in user_id)
    if (search) {
      filter.user_id = { $regex: search, $options: 'i' };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalCount = await Target.countDocuments(filter);
    
    // Get targets with pagination
    const targets = await Target.find(filter)
      .populate({
        path: 'exercises.id',
        select: '_id category exercise method color icon',
        model: 'Exercise'
      })
      .sort({ user_id: 1, date: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get unique user IDs from targets
    const userIds = [...new Set(targets.map(target => target.user_id))];
    
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
    
    // Transform targets to include user information and weekly format
    const transformedTargets = targets.map(target => {
      const targetObj = target.toObject();
      const user = userMap[target.user_id];
      
      // Add user information
      targetObj.user = user ? {
        _id: user._id,
        name: user.name,
        email: user.email,
        user_id: user.user_id,
        loginType: user.loginType,
        createdAt: user.createdAt
      } : null;
      
      // Transform exercises array
      if (targetObj.exercises && targetObj.exercises.length > 0) {
        targetObj.exercises = targetObj.exercises.map(exercise => {
          if (exercise.id && typeof exercise.id === 'object') {
            return {
              _id: exercise.id._id,
              category: exercise.id.category,
              exercise: exercise.id.exercise,
              method: exercise.id.method,
              color: exercise.id.color,
              icon: exercise.id.icon,
              minutes: exercise.minutes,
              total_sessions: exercise.total_sessions
            };
          } else {
            return exercise;
          }
        });
      }
      
      // Add week information
      const targetDate = new Date(targetObj.date);
      const weekStart = new Date(targetDate);
      weekStart.setDate(targetDate.getDate() - targetDate.getDay()); // Start of week (Sunday)
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      targetObj.weekInfo = {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weekNumber: Math.ceil((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekShort: targetDate.toLocaleDateString('en-US', { weekday: 'short' })
      };
      
      return targetObj;
    });
    
    // Group targets by user first, then by week
    const userWeeklyTargets = transformedTargets.reduce((users, target) => {
      const userId = target.user_id;
      
      if (!users[userId]) {
        users[userId] = {
          user: target.user,
          weeklyData: {},
          totalTargets: 0,
          totalWeeks: 0
        };
      }
      
      const weekKey = target.weekInfo.weekStart;
      
      if (!users[userId].weeklyData[weekKey]) {
        users[userId].weeklyData[weekKey] = {
          weekStart: target.weekInfo.weekStart,
          weekEnd: target.weekInfo.weekEnd,
          weekNumber: target.weekInfo.weekNumber,
          targets: [],
          totalDays: 0,
          totalExercises: 0,
          totalSteps: 0,
          avgCarbs: 0,
          avgFat: 0,
          avgProtein: 0
        };
      }
      
      // Add target to week
      users[userId].weeklyData[weekKey].targets.push(target);
      users[userId].totalTargets++;
      
      // Calculate weekly totals
      const week = users[userId].weeklyData[weekKey];
      week.totalDays = week.targets.length;
      week.totalExercises = week.targets.reduce((sum, t) => sum + (t.exercises ? t.exercises.length : 0), 0);
      week.totalSteps = week.targets.reduce((sum, t) => sum + (t.steps || 0), 0);
      week.avgCarbs = Math.round(week.targets.reduce((sum, t) => sum + (t.carbs || 0), 0) / week.targets.length);
      week.avgFat = Math.round(week.targets.reduce((sum, t) => sum + (t.fat || 0), 0) / week.targets.length);
      week.avgProtein = Math.round(week.targets.reduce((sum, t) => sum + (t.protein || 0), 0) / week.targets.length);
      
      return users;
    }, {});
    
    // Convert to array format and sort weeks for each user
    const userWeeklyArray = Object.values(userWeeklyTargets).map(userData => {
      // Convert weekly data to array and sort by week start date
      const weeklyArray = Object.values(userData.weeklyData)
        .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
      
      // Sort targets within each week by date
      weeklyArray.forEach(week => {
        week.targets.sort((a, b) => new Date(a.date) - new Date(b.date));
      });
      
      // Get only the last week data for each user
      const lastWeek = weeklyArray[weeklyArray.length - 1];
      
      userData.totalWeeks = weeklyArray.length;
      userData.lastWeekData = lastWeek || null; // Only include last week data
      userData.weeklyData = null; // Remove all weeks data to save space
      
      return userData;
    });
    
    // Sort users by name
    userWeeklyArray.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      message: "Targets retrieved successfully",
      data: {
        userWeeklyView: userWeeklyArray,
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
          search: search || null
        },
        summary: {
          totalUsers: userWeeklyArray.length,
          totalWeeks: userWeeklyArray.reduce((sum, user) => sum + user.totalWeeks, 0),
          totalTargets: userWeeklyArray.reduce((sum, user) => sum + user.totalTargets, 0)
        }
      }
    });
    
  } catch (err) {
    console.error('Error in getAllTargetsWithUsers:', err);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: err.message 
    });
  }
};

// Get all weeks data for a specific user (Admin API)
exports.getUserAllWeeksData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      startDate, 
      endDate,
      page = 1, 
      limit = 50
    } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: "User ID is required" 
      });
    }
    
    // Build filter object
    let filter = { 
      user_id: userId,
      isDeleted: false 
    };
    
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
      filter.date = { $gte: parsedStartDate, $lte: parsedEndDate };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalCount = await Target.countDocuments(filter);
    
    // Get targets with pagination
    const targets = await Target.find(filter)
      .populate({
        path: 'exercises.id',
        select: '_id category exercise method color icon',
        model: 'Exercise'
      })
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get user information
    const User = require('../models/User');
    const user = await User.findOne({ user_id: userId })
      .select('_id name email user_id loginType createdAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    
    // Transform targets to include weekly format
    const transformedTargets = targets.map(target => {
      const targetObj = target.toObject();
      
      // Transform exercises array
      if (targetObj.exercises && targetObj.exercises.length > 0) {
        targetObj.exercises = targetObj.exercises.map(exercise => {
          if (exercise.id && typeof exercise.id === 'object') {
            return {
              _id: exercise.id._id,
              category: exercise.id.category,
              exercise: exercise.id.exercise,
              method: exercise.id.method,
              color: exercise.id.color,
              icon: exercise.id.icon,
              minutes: exercise.minutes,
              total_sessions: exercise.total_sessions
            };
          } else {
            return exercise;
          }
        });
      }
      
      // Add week information
      const targetDate = new Date(targetObj.date);
      const weekStart = new Date(targetDate);
      weekStart.setDate(targetDate.getDate() - targetDate.getDay()); // Start of week (Sunday)
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      targetObj.weekInfo = {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        weekNumber: Math.ceil((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        dayOfWeek: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfWeekShort: targetDate.toLocaleDateString('en-US', { weekday: 'short' })
      };
      
      return targetObj;
    });
    
    // Group targets by week
    const weeklyTargets = transformedTargets.reduce((weeks, target) => {
      const weekKey = target.weekInfo.weekStart;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart: target.weekInfo.weekStart,
          weekEnd: target.weekInfo.weekEnd,
          weekNumber: target.weekInfo.weekNumber,
          targets: [],
          totalDays: 0,
          totalExercises: 0,
          totalSteps: 0,
          avgCarbs: 0,
          avgFat: 0,
          avgProtein: 0
        };
      }
      
      // Add target to week
      weeks[weekKey].targets.push(target);
      
      // Calculate weekly totals
      const week = weeks[weekKey];
      week.totalDays = week.targets.length;
      week.totalExercises = week.targets.reduce((sum, t) => sum + (t.exercises ? t.exercises.length : 0), 0);
      week.totalSteps = week.targets.reduce((sum, t) => sum + (t.steps || 0), 0);
      week.avgCarbs = Math.round(week.targets.reduce((sum, t) => sum + (t.carbs || 0), 0) / week.targets.length);
      week.avgFat = Math.round(week.targets.reduce((sum, t) => sum + (t.fat || 0), 0) / week.targets.length);
      week.avgProtein = Math.round(week.targets.reduce((sum, t) => sum + (t.protein || 0), 0) / week.targets.length);
      
      return weeks;
    }, {});
    
    // Convert to array format and sort weeks by date
    const weeklyArray = Object.values(weeklyTargets)
      .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    
    // Sort targets within each week by date
    weeklyArray.forEach(week => {
      week.targets.sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;
    
    res.status(200).json({
      success: true,
      message: "User weekly data retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          user_id: user.user_id,
          loginType: user.loginType,
          createdAt: user.createdAt
        },
        weeklyData: weeklyArray,
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
          endDate: endDate || null
        },
        summary: {
          totalWeeks: weeklyArray.length,
          totalTargets: totalCount,
          totalDays: weeklyArray.reduce((sum, week) => sum + week.totalDays, 0),
          totalExercises: weeklyArray.reduce((sum, week) => sum + week.totalExercises, 0),
          totalSteps: weeklyArray.reduce((sum, week) => sum + week.totalSteps, 0),
          avgCarbs: Math.round(weeklyArray.reduce((sum, week) => sum + week.avgCarbs, 0) / weeklyArray.length),
          avgFat: Math.round(weeklyArray.reduce((sum, week) => sum + week.avgFat, 0) / weeklyArray.length),
          avgProtein: Math.round(weeklyArray.reduce((sum, week) => sum + week.avgProtein, 0) / weeklyArray.length)
        }
      }
    });
    
  } catch (err) {
    console.error('Error in getUserAllWeeksData:', err);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: err.message 
    });
  }
};
