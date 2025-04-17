import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Users, ShieldCheck } from 'lucide-react';
import type { Department, Employee } from '../types';

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'departments'));
        const depts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Department));
        setDepartments(depts);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!selectedDept) {
        setEmployees([]);
        return;
      }

      try {
        const querySnapshot = await getDocs(collection(db, 'employees'));
        const emps = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Employee))
          .filter(emp => emp.departmentId === selectedDept && emp.status === 'active');
        setEmployees(emps);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employees');
      }
    };

    fetchEmployees();
  }, [selectedDept]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !pin) return;

    const employee = employees.find(emp => emp.id === selectedEmployee);
    if (employee?.pin === pin) {
      navigate(`/employee/${employee.id}`);
    } else {
      setError('Invalid PIN');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Employee Login
          </h2>
          <div className="mt-2 text-center">
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Admin Login
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <div className="mt-1 relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  id="department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="appearance-none rounded-md relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="employee" className="block text-sm font-medium text-gray-700">
                Employee
              </label>
              <div className="mt-1 relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  id="employee"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={!selectedDept}
                  className="appearance-none rounded-md relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                PIN
              </label>
              <div className="mt-1">
                <input
                  id="pin"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your PIN"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!selectedEmployee || !pin}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLogin;