import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Create a new backend endpoint to get sorted performance data
        const res = await axios.get('http://localhost:5001/api/performance/leaderboard');
        setLeaderboard(res.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="text-center mt-10">Loading Leaderboard...</div>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Top Performers (Sit-ups)</h2>
      {leaderboard.length === 0 ? (
        <p className="text-center">No data available for the leaderboard.</p>
      ) : (
        <ol className="list-decimal list-inside bg-white shadow-md rounded-lg p-6 max-w-lg mx-auto">
          {leaderboard.map((item, index) => (
            <li key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <span className="font-semibold text-lg">{item.userId.username}</span>
              <span className="text-blue-600 font-bold">{JSON.parse(item.result).count} reps</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default Leaderboard;