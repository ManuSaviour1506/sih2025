const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testType: { type: String, required: true },
  result: { type: String, required: true },
  analysisData: { type: Object },
  videoUrl: { type: String },
  verified: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Performance', PerformanceSchema);