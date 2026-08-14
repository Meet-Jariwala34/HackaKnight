import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  return (
    <div>
      {/* ... your dashboard cards ... */}

      {/* Button navigating to AI Mock Interview */}
      <button
        onClick={() => navigate('/interview')}
        className="start-button"
      >
        Start Session
      </button>

      {/* Link navigating to Jobs */}
      <button
        onClick={() => navigate('/jobs')}
        className="text-blue-600 hover:underline"
      >
        View All Jobs
      </button>

      {/* Button navigating to Resume Corrections */}
      <button
        onClick={() => navigate('/corrections')}
        className="text-blue-600 hover:underline"
      >
        View Full Analysis
      </button>
    </div>
  );
}