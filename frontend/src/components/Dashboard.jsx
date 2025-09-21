import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { isLoggedIn, authAxios } = useAuth();
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalVideoUrl, setModalVideoUrl] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardTestType, setLeaderboardTestType] = useState('Sit Ups');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const fetchPerformanceData = async () => {
      try {
        const response = await authAxios.get('/api/performance');
        // ✅ Add a check for data validity here as a safeguard
        if (Array.isArray(response.data)) {
          setPerformanceData(response.data);
        } else {
          throw new Error('Received invalid data from the server.');
        }
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
        setError('Failed to fetch performance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [isLoggedIn, navigate, authAxios]);
  
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!leaderboardTestType) return;
      setLoadingLeaderboard(true);
      try {
        // ✅ Corrected API call with a query parameter
        const response = await axios.get(`/api/performance/leaderboard?testType=${leaderboardTestType}`);
        setLeaderboard(response.data);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setLeaderboard([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };
    
    fetchLeaderboard();
  }, [leaderboardTestType]);

  if (loading) {
    return <div className="text-center mt-10">Loading performance data...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  if (!Array.isArray(performanceData)) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-500">Error: Received invalid data from the server. Please check your backend logs.</p>
      </div>
    );
  }

  const sitUpData = performanceData.filter(p => p.testType === 'Sit Ups').sort((a, b) => new Date(a.date) - new Date(b.date));
  const sitUpChartData = {
    labels: sitUpData.map((_, i) => `Test ${i + 1}`),
    datasets: [{
      label: 'Sit-ups Count',
      data: sitUpData.map(p => p.score || (p.result && p.result.count)),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      tension: 0.4
    }],
  };
  const sitUpChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Sit-ups Performance Over Time' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Count' } },
      x: { title: { display: true, text: 'Test Number' } }
    }
  };

  const hasAchievedSitUpBadge = sitUpData.some(p => (p.score || (p.result && p.result.count)) >= 50);

  const openModal = (url) => setModalVideoUrl(url);
  const closeModal = () => setModalVideoUrl(null);

  const allTestTypes = ['Sit Ups', 'Vertical Jump', 'Shuttle Run', 'Endurance Run', 'Broad Jump'];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Performance Dashboard</h1>
      
      {performanceData.length === 0 ? (
        <p className="text-center text-gray-500">You haven't completed any assessments yet. Start a new test to see your results here!</p>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Your Progress</h2>
            {sitUpData.length > 0 ? (
              <Line options={sitUpChartOptions} data={sitUpChartData} />
            ) : (
              <p className="text-gray-500">Complete a Sit-ups test to see your progress chart here.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Badges & Achievements</h2>
            <div className="flex flex-wrap gap-4">
              {hasAchievedSitUpBadge ? (
                <div className="p-4 bg-yellow-400 rounded-lg text-white font-bold">
                  🌟 50 Sit-ups Master! 🌟
                </div>
              ) : (
                <p className="text-gray-500">Keep training to earn badges!</p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Past Assessments</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full leading-normal">
                <thead>
                  <tr>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Test Name
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Analysis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((test) => (
                    <tr key={test._id}>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">{test.testType}</p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">{test.score || (test.result && test.result.count) || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">
                          {new Date(test.date).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">
                          {test.score ? test.score.toFixed(2) : 'N/A'}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        {test.analyzedVideoUrl && (
                          <button
                            onClick={() => openModal(test.analyzedVideoUrl)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Video
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <hr className="my-6" />
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
        <div className="mb-4">
          <label htmlFor="test-select" className="block text-gray-700 font-bold mb-2">
            Select a Test:
          </label>
          <select
            id="test-select"
            value={leaderboardTestType}
            onChange={(e) => setLeaderboardTestType(e.target.value)}
            className="block w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allTestTypes.map((test) => (
              <option key={test} value={test}>{test}</option>
            ))}
          </select>
        </div>
        
        {loadingLeaderboard ? (
          <p className="text-center text-gray-500">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-gray-500">No leaderboard data available for this test yet. Be the first to submit a performance!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((performer, index) => (
                  <tr key={performer._id}>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{index + 1}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{performer.username}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{performer.score.toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{new Date(performer.date).toLocaleDateString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white p-4 rounded-lg shadow-xl relative max-w-4xl w-full">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-800 text-3xl font-bold"
            >
              &times;
            </button>
            <div className="mt-4">
              <video controls src={modalVideoUrl} className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;