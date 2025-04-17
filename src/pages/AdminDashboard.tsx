import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, differenceInMinutes } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, Users, Building2 } from 'lucide-react';
import type { Shift, Employee, Department } from '../types';

interface ShiftWithDetails extends Shift {
  employee: Employee;
  department: Department;
}

const AdminDashboard = () => {
  const [activeShifts, setActiveShifts] = useState<ShiftWithDetails[]>([]);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalApplications, setTotalApplications] = useState(0);

  useEffect(() => {
    const fetchActiveShifts = async () => {
      try {
        // Fetch active shifts
        const shiftsRef = collection(db, 'shifts');
        const shiftsQuery = query(shiftsRef, where('status', '==', 'active'));
        const shiftsSnapshot = await getDocs(shiftsQuery);
        
        // Fetch all employees and departments
        const employeesSnapshot = await getDocs(collection(db, 'employees'));
        const departmentsSnapshot = await getDocs(collection(db, 'departments'));

        const employees = new Map(
          employeesSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Employee])
        );

        const departments = new Map(
          departmentsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Department])
        );

        const shifts = shiftsSnapshot.docs.map(doc => {
          const shift = { id: doc.id, ...doc.data() } as Shift;
          const employee = employees.get(shift.employeeId);
          const department = departments.get(shift.departmentId);

          return {
            ...shift,
            employee: employee!,
            department: department!
          };
        });

        const totalApps = shifts.reduce((sum, shift) => sum + shift.applications, 0);
        
        setActiveShifts(shifts);
        setTotalApplications(totalApps);
      } catch (err) {
        console.error('Error fetching shifts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveShifts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Active Shifts Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-blue-500 mr-2" />
                <h2 className="text-lg font-semibold">Active Shifts</h2>
              </div>
              <p className="text-2xl font-bold mt-2">{activeShifts.length}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-green-500 mr-2" />
                <h2 className="text-lg font-semibold">Total Applications</h2>
              </div>
              <p className="text-2xl font-bold mt-2">{totalApplications}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-purple-500 mr-2" />
                <h2 className="text-lg font-semibold">Departments Active</h2>
              </div>
              <p className="text-2xl font-bold mt-2">
                {new Set(activeShifts.map(shift => shift.departmentId)).size}
              </p>
            </div>
          </div>

          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Start Time</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Duration</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Applications</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {activeShifts.map((shift) => (
                  <React.Fragment key={shift.id}>
                    <tr>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{shift.employee.name}</div>
                        <div className="text-gray-500">{shift.employee.employeeId}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {shift.department.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(shift.startTime), 'PPp')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {Math.floor(differenceInMinutes(new Date(), new Date(shift.startTime)) / 60)}h{' '}
                        {differenceInMinutes(new Date(), new Date(shift.startTime)) % 60}m
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {shift.applications}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <button
                          onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedShift === shift.id ? <ChevronUp /> : <ChevronDown />}
                        </button>
                      </td>
                    </tr>
                    {expandedShift === shift.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="text-sm">
                            <h4 className="font-medium text-gray-900 mb-2">Application Timestamps</h4>
                            <div className="space-y-1">
                              {shift.applicationTimestamps.map((timestamp, index) => (
                                <div key={index} className="text-gray-600">
                                  {format(new Date(timestamp), 'PPp')} - Application #{index + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;