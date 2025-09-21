// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/authRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const imagekitRoutes = require('./routes/imagekitRoutes');
const User = require('./models/User');
const Performance = require('./models/Performance');

const app = express();
const server = http.createServer(app);

// Use a single, shared CORS origin
const allowedOrigins = ["http://localhost:5173", "http://localhost:3000"];
const io = new Server(server, { cors: { origin: allowedOrigins, methods: ["GET", "POST"] } });
const jwtSecret = process.env.JWT_SECRET;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/imagekit', imagekitRoutes);

// Main real-time analysis flow
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    let userId = null;
    let pythonProcess = null;

    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, jwtSecret);
            userId = decoded.user.id;
            console.log(`Authenticated user ${userId} connected.`);
        } catch (err) { 
            console.error("Authentication failed for socket connection:", err); 
            socket.emit('error', { msg: 'Authentication failed.' });
        }
    });

    socket.on('start-analysis', (testType) => {
        if (!userId) {
            socket.emit('error', { msg: 'Authentication required to start analysis.' });
            return;
        }

        if (pythonProcess) {
            console.log('Analysis already running, terminating old process.');
            pythonProcess.kill();
        }

        console.log(`Starting analysis for test type: ${testType}`);
        // ✅ CRITICAL: Spawn a single, long-running Python process
        pythonProcess = spawn('python', ['ml-services/realtime_analysis.py', testType]);

        // Listen for data from the Python script's stdout
        pythonProcess.stdout.on('data', (data) => {
            try {
                const analysisResult = JSON.parse(data.toString());
                socket.emit('analysis-result', analysisResult);
            } catch (e) {
                console.error("Failed to parse JSON from Python script:", e);
            }
        });

        // Listen for errors from the Python script
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python stderr: ${data.toString()}`);
            socket.emit('error', { msg: 'Python script error.', details: data.toString() });
        });

        // Handle process exit
        pythonProcess.on('close', (code) => {
            console.log(`Python process closed with code ${code}.`);
            pythonProcess = null;
        });
    });

    socket.on('video-stream', (frameData) => {
        if (!userId || !pythonProcess) {
            // Drop the frame if not authenticated or if analysis isn't running
            return;
        }
        // ✅ CRITICAL: Stream each frame directly to the Python process's stdin
        pythonProcess.stdin.write(frameData);
    });

    socket.on('end-analysis', async (finalResult) => {
        if (!userId) return;

        console.log('Finalizing analysis and saving results.');
        if (pythonProcess) {
            pythonProcess.stdin.end(); // Signal the end of the stream
            pythonProcess.kill();
        }

        try {
            // ✅ CRITICAL: Save the result only once after the test is complete
            const newPerformance = new Performance({
                userId: userId,
                testType: finalResult.testType,
                score: finalResult.score,
                result: finalResult.result,
                analyzedVideoUrl: finalResult.analyzedVideoUrl,
            });
            await newPerformance.save();
            console.log(`Performance data saved for user ${userId}.`);
        } catch (err) {
            console.error("Error saving final performance data:", err);
            socket.emit('error', { msg: 'Failed to save final results.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (pythonProcess) {
            pythonProcess.kill(); // Clean up the Python process on disconnect
        }
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));