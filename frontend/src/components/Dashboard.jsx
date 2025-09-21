import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
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

// Register Chart.js components
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

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const fetchPerformanceData = async () => {
      try {
        const response = await authAxios.get('/api/performance');
        setPerformanceData(response.data);
      } catch (err) {
        console.error('Failed to fetch performance data:', err);
        setError('Failed to fetch performance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [isLoggedIn, navigate, authAxios]);

  if (loading) {
    return <div className="text-center mt-10">Loading performance data...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  // Filter and prepare data for the Sit-ups chart
  const sitUpData = performanceData.filter(p => p.testType === 'Sit Ups').sort((a, b) => new Date(a.date) - new Date(b.date));
  const sitUpChartData = {
    labels: sitUpData.map((_, i) => `Test ${i + 1}`),
    datasets: [{
      label: 'Sit-ups Count',
      data: sitUpData.map(p => p.score || p.result?.count), // Handle both score and nested result.count
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

  // Logic for the Sit-ups badge
  const hasAchievedSitUpBadge = sitUpData.some(p => (p.score || p.result?.count) >= 50);

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
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((test) => (
                    <tr key={test._id}>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">{test.testType}</p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">{test.score || test.result || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <p className="text-gray-900 whitespace-no-wrap">
                          {new Date(test.date).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;