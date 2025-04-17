import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EmployeeLogin from './pages/EmployeeLogin';
import AdminLogin from './pages/AdminLogin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DeviceAuth from './components/DeviceAuth';

function App() {
  return (
    <BrowserRouter>
      <DeviceAuth>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<EmployeeLogin />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/employee/*" element={<EmployeeDashboard />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </DeviceAuth>
    </BrowserRouter>
  );
}

export default App;