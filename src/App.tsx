import React, { useEffect, useState } from 'react';
import Interface1 from './components/Interface1';
import AdminViewer from './components/AdminViewer';
import AdminLogin from './components/AdminLogin';
import { auth } from './lib/firebase';
import { User } from 'firebase/auth';
import { LogIn, Home, BarChart2, Wifi, Users } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Employee Shift Management</h1>
              </div>
              {user && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <button
                    onClick={() => setActiveTab('home')}
                    className={`${
                      activeTab === 'home'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('employees')}
                    className={`${
                      activeTab === 'employees'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Employees
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`${
                      activeTab === 'reports'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Reports
                  </button>
                  <button
                    onClick={() => setActiveTab('connections')}
                    className={`${
                      activeTab === 'connections'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    Connections
                  </button>
                </div>
              )}
            </div>
            {!user && (
              <div className="flex items-center">
                <button
                  onClick={() => setShowAdminLogin(!showAdminLogin)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                  Admin Login
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {user ? (
          <AdminViewer activeTab={activeTab} />
        ) : (
          <>
            <Interface1 />
            {showAdminLogin && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="relative">
                  <button
                    onClick={() => setShowAdminLogin(false)}
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <AdminLogin />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;