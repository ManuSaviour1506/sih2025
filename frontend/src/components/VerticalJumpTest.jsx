import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const VerticalJumpTest = () => {
  const navigate = useNavigate();
  const { isLoggedIn, authAxios, token } = useAuth();
  
  const [videoFile, setVideoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const videoRef = useRef(null);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(file);
        setAnalysisResult(null);
        setUploadMessage('');
      }
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) {
      setUploadMessage("Please select a video file first.");
      return;
    }

    setIsUploading(true);
    setAnalysisResult(null);
    setUploadMessage('Uploading...');

    if (!token) {
        setUploadMessage('Authentication required. Please log in.');
        setIsUploading(false);
        return;
    }

    try {
      // Get authentication parameters from your backend
      const authRes = await authAxios.get('/api/imagekit/auth');
      const { token: ikToken, expire, signature } = authRes.data;

      // Prepare the form data for direct upload to ImageKit
      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('fileName', videoFile.name);
      formData.append('publicKey', 'public_LSNp012QVTYVNFVfmYmBzlrd0cA=');
      formData.append('token', ikToken);
      formData.append('expire', expire);
      formData.append('signature', signature);
      formData.append('folder', '/sports-assessments/');

      // Upload the file directly to ImageKit's API
      const uploadRes = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Trigger analysis on your backend with the video URL
      const videoUrl = uploadRes.data.url;
      const analysisRes = await authAxios.post('/api/performance/analyze', { videoUrl, testType: 'Vertical Jump' });

      setAnalysisResult(analysisRes.data.finalResult);
      setUploadMessage('Video uploaded and analysis started!');
      
    } catch (error) {
      console.error('Upload/Analysis error:', error.response ? error.response.data : error.message);
      setUploadMessage('Failed to upload video or start analysis: ' + (error.response ? error.response.data.msg : error.message));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Vertical Jump Assessment</h1>
      <div className="my-8">
        <input type="file" accept="video/*" onChange={handleFileChange} className="mb-4" />
        <video ref={videoRef} controls className="rounded-lg shadow-lg" style={{ maxWidth: '600px' }} />
      </div>
      <button onClick={uploadVideo} disabled={isUploading} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400">
        {isUploading ? 'Analyzing...' : 'Upload and Analyze'}
      </button>

      {uploadMessage && <p className="mt-4 text-center">{uploadMessage}</p>}

      {analysisResult && (
        <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold">Analysis Result</h2>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default VerticalJumpTest;