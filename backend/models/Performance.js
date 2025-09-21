const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  // The user ID, linked to the User collection
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the 'User' model
    required: true
  },
  // The type of test performed (e.g., 'Sit Ups', 'Broad Jump')
  testType: {
    type: String,
    required: true
  },
  // A single, comparable numerical score for the leaderboard
  score: {
    type: Number
  },
  // The URL of the video with superimposed analysis
  analyzedVideoUrl: {
    type: String
  },
  // The full JSON result from the Python analysis
  result: {
    type: Object,
    required: true
  },
  // The date and time the performance was recorded
  date: {
    type: Date,
    default: Date.now
  }
});

// Export the model
module.exports = mongoose.model('Performance', PerformanceSchema);