import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// A sample list of test types
const testTypes = ['Sit Ups', 'Vertical Jump', 'Shuttle Run', 'Endurance Run', 'Broad Jump'];

const LiveAnalyzer = () => {
  const { isLoggedIn, authAxios } = useAuth();
  const navigate = useNavigate();

  const [selectedTestType, setSelectedTestType] = useState('Sit Ups');
  const [isRecording, setIsRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const startRecording = async () => {
    setUploadMessage('Starting recording...');
    setAnalysisResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoRef.current.srcObject = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        setUploadMessage('Recording finished. Uploading for analysis...');
        
        const videoBlob = new Blob(chunks.current, { type: 'video/mp4' });
        chunks.current = [];
        
        const formData = new FormData();
        formData.append('video', videoBlob, 'assessment.mp4');
        formData.append('testType', selectedTestType);

        try {
          const response = await authAxios.post('/api/performance/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setAnalysisResult(response.data.finalResult);
          setUploadMessage('Analysis completed successfully!');
        } catch (error) {
          console.error('Upload/Analysis error:', error.response ? error.response.data : error.message);
          setUploadMessage('Analysis failed: ' + (error.response ? error.response.data.msg : error.message));
        } finally {
          setIsRecording(false);
        }
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setUploadMessage('Recording...');
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setUploadMessage('Failed to access webcam.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Live Analyzer (Record & Analyze)</h1>

      <div className="flex justify-center items-center gap-4 mb-6">
        <select
          value={selectedTestType}
          onChange={(e) => setSelectedTestType(e.target.value)}
          className="px-4 py-2 border rounded-lg"
          disabled={isRecording}
        >
          {testTypes.map((test) => (
            <option key={test} value={test}>{test}</option>
          ))}
        </select>
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400"
        >
          Start Recording
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:bg-gray-400"
        >
          Stop Recording
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Live Video Feed</h2>
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg" />
        </div>

        <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Analysis Status</h2>
          <p className="text-xl font-bold">{uploadMessage}</p>
          {analysisResult && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Final Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg mt-2 text-sm whitespace-pre-wrap">{JSON.stringify(analysisResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAnalyzer;