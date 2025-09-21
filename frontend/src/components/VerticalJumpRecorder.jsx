import React, { useState, useRef } from 'react';
import axios from 'axios';

const VerticalJumpRecorder = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const videoRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      // Display the selected video in the video player
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(file);
      }
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) {
      alert("Please select a video file first.");
      return;
    }

    setUploading(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('testType', 'Vertical Jump'); // Specify test type for the backend

    const token = localStorage.getItem('token');

    try {
      const response = await axios.post('http://localhost:5001/api/performance/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token,
        },
      });

      setAnalysisResult(response.data.finalResult);
      console.log('Analysis Result:', response.data);
      alert('Video uploaded and analyzed successfully!');

    } catch (error) {
      console.error('Error uploading video:', error.response ? error.response.data : error.message);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Vertical Jump Assessment</h1>
      <div className="my-8">
        <input type="file" accept="video/*" onChange={handleFileChange} className="mb-4" />
        <video ref={videoRef} controls className="rounded-lg shadow-lg" style={{ maxWidth: '600px' }} />
      </div>
      <button onClick={uploadVideo} disabled={uploading} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400">
        {uploading ? 'Analyzing...' : 'Upload and Analyze'}
      </button>

      {analysisResult && (
        <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Analysis Results</h2>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default VerticalJumpRecorder;