import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
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

const AthleteProfile = () => {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams(); // Get user ID from URL parameter

  useEffect(() => {
    const fetchPerformances = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view this profile.');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`http://localhost:5001/api/performance/athlete/${id}`, {
          headers: { 'x-auth-token': token },
        });
        setPerformances(res.data);
      } catch (err) {
        setError('Failed to fetch profile data.');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformances();
  }, [id]);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  const sitUpData = performances.filter(p => p.testType === 'Sit Ups');
  const chartData = {
    labels: sitUpData.map((p, i) => `Test ${i + 1}`),
    datasets: [{
      label: 'Sit-ups Count',
      data: sitUpData.map(p => JSON.parse(p.result).count),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
    }],
  };
  
  // Logic for awarding badges (conceptual)
  const getBadges = (data) => {
    const badges = [];
    if (data.length >= 5) badges.push({ name: "5 Tests Completed", color: "bg-blue-500" });
    const maxSitups = data.length > 0 ? Math.max(...data.map(p => JSON.parse(p.result).count)) : 0;
    if (maxSitups >= 50) badges.push({ name: "50 Sit-ups Club", color: "bg-green-500" });
    return badges;
  };
  const badges = getBadges(performances);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Athlete Performance Profile</h1>
      {performances.length === 0 ? (
        <p className="text-center">No performance data found. Complete a test to see your results!</p>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Progress Chart</h2>
            <Line data={chartData} />
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Badges Earned</h2>
            <div className="flex flex-wrap gap-4">
              {badges.length === 0 ? (
                <p>No badges yet. Keep training!</p>
              ) : (
                badges.map((badge, index) => (
                  <div key={index} className={`p-4 rounded-lg text-white font-bold ${badge.color}`}>
                    {badge.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default AthleteProfile;