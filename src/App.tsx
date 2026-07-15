import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import VisitorGatePage from './pages/VisitorGatePage';
import VisitorViewerPage from './pages/VisitorViewerPage';
import OwnerViewerPage from './pages/OwnerViewerPage';

// Simple auth wrapper for owner routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('owner_token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Owner Flows */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/repos/:id/view" 
          element={
            <ProtectedRoute>
              <OwnerViewerPage />
            </ProtectedRoute>
          } 
        />

        {/* Visitor Flows */}
        <Route path="/s/:slug" element={<VisitorGatePage />} />
        <Route path="/s/:slug/view" element={<VisitorViewerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
