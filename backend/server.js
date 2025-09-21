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

const io = new Server(server, { cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] } });
const jwtSecret = process.env.JWT_SECRET;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected')).catch(err => console.error(err));

app.use('/api/auth', authRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/imagekit', imagekitRoutes);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let userId = null;
  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      userId = decoded.user.id;
      console.log(`Authenticated user ${userId} connected.`);
    } catch (err) { console.error("Authentication failed for socket connection:", err); }
  });
  socket.on('video-stream', (data) => {
    if (!userId) { socket.emit('error', { msg: 'Authentication required for streaming.' }); return; }
    const base64Data = data.frameData.replace(/^data:image\/\w+;base64,/, "");
    const pythonProcess = spawn('python', ['ml-services/analyze_video.py', base64Data, 'Sit Ups']);
    let analysisResult = '';
    pythonProcess.stdout.on('data', (data) => { analysisResult += data.toString(); });
    pythonProcess.stdout.on('end', async () => {
      try {
        const result = JSON.parse(analysisResult);
        socket.emit('analysis-result', result);
        console.log('Analysis sent back:', result);
        const newPerformance = new Performance({
          userId: userId, testType: result.testType, result: JSON.stringify(result), analysisData: result, verified: true
        });
        await newPerformance.save();
        console.log(`Performance data saved for user ${userId}.`);
      } catch (e) { console.error("Error processing or saving data:", e); }
    });
    pythonProcess.stderr.on('data', (data) => { console.error(`Python Error: ${data.toString()}`); });
  });
  socket.on('disconnect', () => { console.log(`User disconnected: ${socket.id}`); });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));