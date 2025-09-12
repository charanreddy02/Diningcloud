import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toaster';
import LandingPage from './pages/LandingPage';
import QRMenuPage from './pages/QRMenuPage';
import AdminDashboard from './pages/AdminDashboard';
import POSSystem from './pages/POSSystem';
import KitchenDashboard from './pages/KitchenDashboard';
import BillPage from './pages/BillPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffSignUpPage from './pages/StaffSignUpPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/staff/login" element={<StaffLoginPage />} />
              <Route path="/staff/signup" element={<StaffSignUpPage />} />
              <Route path="/restaurant/:slug/menu/:table" element={<QRMenuPage />} />
              <Route path="/restaurant/:slug/bill/:orderId" element={<BillPage />} />

              {/* Protected Routes */}
              <Route 
                path="/admin/:restaurantSlug/*" 
                element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} 
              />
              <Route 
                path="/pos/:restaurantSlug" 
                element={<ProtectedRoute><POSSystem /></ProtectedRoute>} 
              />
              <Route 
                path="/kitchen/:restaurantSlug" 
                element={<ProtectedRoute><KitchenDashboard /></ProtectedRoute>} 
              />
            </Routes>
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
