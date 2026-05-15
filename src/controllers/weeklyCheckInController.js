const DailyCheckIn = require('../models/DailyCheckIn');

// Receives req.body = { user_id, checkIns: [ {date, weight_kg, ...}, ... ] }
exports.weeklyCheckIn = async (req, res) => {
  try {
    const { user_id, checkIns } = req.body;
    if (!user_id || !Array.isArray(checkIns) || checkIns.length !== 7) {
      return res.status(400).json({ message: 'user_id and 7 checkIns required' });
    }

    const results = [];
    for (const checkIn of checkIns) {
      if (!checkIn.date) {
        results.push({ error: 'Missing date', checkIn });
        continue;
      }
      const filter = { user_id, date: new Date(checkIn.date) };
      const update = { ...checkIn, user_id, updatedAt: new Date() };
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };
      const doc = await DailyCheckIn.findOneAndUpdate(filter, update, options);
      results.push(doc);
    }
    res.json({ message: 'Weekly check-in processed', results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 