import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import useAuth from './hooks/useAuth.jsx'; // ✅ Corrected import path
import './index.css';

import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import SAIDashboard from './components/SAIDashboard.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import Dashboard from './components/Dashboard.jsx';
import AthleteProfile from './components/AthleteProfile.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Unauthorized from './components/Unauthorized.jsx';
import LiveAnalyzer from './components/LiveAnalyzer.jsx';
import VerticalJumpTest from './components/VerticalJumpTest.jsx';
import SitUpsTest from './components/SitUpsTest.jsx';
import BroadJumpTest from './components/BroadJumpTest.jsx';
import ShuttleRunTest from './components/ShuttleRunTest.jsx';
import EnduranceRunTest from './components/EnduranceRunTest.jsx';

const TestSelectionPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Select an Assessment Test</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                <Link to="/tests/situps" className="p-6 text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition text-center font-semibold">
                    Sit-Ups Test
                </Link>
                <Link to="/tests/verticaljump" className="p-6 text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition text-center font-semibold">
                    Vertical Jump Test
                </Link>
                <Link to="/tests/broadjump" className="p-6 text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition text-center font-semibold">
                    Broad Jump Test
                </Link>
                <Link to="/tests/shuttlerun" className="p-6 text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition text-center font-semibold">
                    Shuttle Run
                </Link>
                <Link to="/tests/endurancerun" className="p-6 text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-600 transition text-center font-semibold">
                    Endurance Run
                </Link>
                <Link to="/tests/live-analyzer" className="p-6 text-white bg-purple-500 rounded-lg shadow-md hover:bg-purple-600 transition text-center font-semibold">
                    Live Analysis
                </Link>
            </div>
        </div>
    );
};

const App = () => {
    const { isLoggedIn, user, logout } = useAuth();

    return (
        <Router>
            <nav className="p-4 bg-gray-800 text-white flex justify-between">
                <Link to="/" className="font-bold text-xl">Sports AI Platform</Link>
                <div className="flex items-center space-x-4">
                    {!isLoggedIn ? (
                        <>
                            <Link to="/login" className="mr-4 hover:text-gray-300">Login</Link>
                            <Link to="/register" className="hover:text-gray-300">Register</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/dashboard" className="mr-4 hover:text-gray-300">My Dashboard</Link>
                            {user && user.role === 'official' && (
                                <Link to="/sai-dashboard" className="mr-4 hover:text-gray-300">SAI Dashboard</Link>
                            )}
                            <Link to="/leaderboard" className="mr-4 hover:text-gray-300">Leaderboard</Link>
                            <button onClick={logout} className="px-3 py-1 bg-red-500 rounded-md hover:bg-red-600 transition">Logout</button>
                        </>
                    )}
                </div>
            </nav>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                <Route element={<PrivateRoute allowedRoles={['athlete', 'official']} />}>
                    <Route path="/" element={<TestSelectionPage />} />
                    <Route path="/tests/situps" element={<SitUpsTest />} />
                    <Route path="/tests/verticaljump" element={<VerticalJumpTest />} />
                    <Route path="/tests/broadjump" element={<BroadJumpTest />} />
                    <Route path="/tests/shuttlerun" element={<ShuttleRunTest />} />
                    <Route path="/tests/endurancerun" element={<EnduranceRunTest />} />
                    <Route path="/tests/live-analyzer" element={<LiveAnalyzer />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile/:id" element={<AthleteProfile />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['official']} />}>
                    <Route path="/sai-dashboard" element={<SAIDashboard />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;