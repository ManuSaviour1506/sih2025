const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Import auth middleware
const Performance = require('../models/Performance');
const User = require('../models/User');

// Middleware to check for 'official' role
const checkRole = (req, res, next) => {
  if (req.user && req.user.role === 'official') {
    next();
  } else {
    res.status(403).json({ msg: 'Access denied: Officials only' });
  }
};

// @route GET /api/sai/dashboard
// @desc Get all verified performance data for SAI officials
router.get('/dashboard', auth, checkRole, async (req, res) => {
  try {
    const performances = await Performance.find()
      .populate('userId', 'username'); // Populate with user's username
      
    res.json(performances);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;