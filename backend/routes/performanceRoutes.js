const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Performance = require('../models/Performance');
const User = require('../models/User'); // Import the User model
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configure Multer for video file storage
const upload = multer({ dest: 'uploads/' });

// @route POST /api/performance
// @desc Save a new performance record (old route for direct analysis)
router.post('/', auth, async (req, res) => {
  const { testType, analysisData } = req.body;
  
  try {
    const newPerformance = new Performance({
      userId: req.user.id,
      testType,
      analysisData,
      verified: true
    });

    const performance = await newPerformance.save();
    res.json(performance);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route POST /api/performance/upload
// @desc Upload video and analysis data (new route for offline analysis)
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  const { testType } = req.body;
  const videoFile = req.file;

  if (!videoFile || !testType) {
    return res.status(400).json({ msg: 'Missing video file or test type.' });
  }

  try {
    const videoPath = videoFile.path;
    const pythonProcess = spawn('python', ['ml-services/analyze_video.py', videoPath, testType]);
    let finalAnalysis = '';

    pythonProcess.stdout.on('data', (data) => {
      finalAnalysis += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        return res.status(500).send('Server error during analysis: Python script failed.');
      }
      try {
        const finalResult = JSON.parse(finalAnalysis);
        
        const newPerformance = new Performance({
          userId: req.user.id,
          testType: finalResult.testType,
          result: JSON.stringify(finalResult),
          analysisData: finalResult,
          videoPath,
          verified: true
        });
        await newPerformance.save();

        res.json({ msg: 'Video and analysis uploaded successfully', finalResult });

      } catch (e) {
        console.error("Error with final analysis (JSON parsing):", e);
        res.status(500).send('Server error during analysis: Invalid Python output.');
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data.toString()}`);
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route POST /api/performance/analyze
// @desc Trigger server-side analysis from a video URL
router.post('/analyze', auth, async (req, res) => {
  const { videoUrl, testType } = req.body;
  if (!videoUrl || !testType) {
    return res.status(400).json({ msg: 'Missing video URL or test type.' });
  }

  try {
    const pythonProcess = spawn('python', ['ml-services/analyze_video.py', videoUrl, testType]);
    let finalAnalysis = '';
    let pythonError = ''; // Add a new variable to capture stderr

    pythonProcess.stdout.on('data', (data) => {
      finalAnalysis += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString(); // Capture the stderr output
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`Python stderr: ${pythonError}`);
        return res.status(500).send(`Server error during analysis: Python script failed. See backend logs for details.`);
      }

      try {
        const finalResult = JSON.parse(finalAnalysis);
        
        const newPerformance = new Performance({
          userId: req.user.id,
          testType: finalResult.testType,
          result: JSON.stringify(finalResult),
          analysisData: finalResult,
          videoUrl,
          verified: true
        });
        await newPerformance.save();

        res.json({ msg: 'Analysis completed successfully', finalResult });
      } catch (e) {
        console.error('Error with final analysis (JSON parsing):', e);
        console.error('Python stdout was:', finalAnalysis);
        res.status(500).send('Server error during analysis: Invalid Python output.');
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route GET /api/performance/athlete/:id
// @desc Get all performance records for a specific athlete
router.get('/athlete/:id', auth, async (req, res) => {
  try {
    const performances = await Performance.find({ userId: req.params.id }).sort({ timestamp: -1 });
    res.json(performances);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route GET /api/performance/leaderboard
// @desc Get top 10 performances, sorted by result (e.g., sit-ups count)
router.get('/leaderboard', async (req, res) => {
    try {
        const topPerformers = await Performance.aggregate([
            { $match: { testType: 'Sit Ups' } },
            {
                $addFields: {
                    parsedResult: {
                        $toInt: { $getField: { input: "$analysisData", field: "count" } }
                    }
                }
            },
            { $sort: { parsedResult: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    testType: 1,
                    result: 1,
                    'userId.username': '$user.username'
                }
            }
        ]);
        res.json(topPerformers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;