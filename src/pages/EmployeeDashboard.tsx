import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Clock, Plus, LogOut, FileText } from 'lucide-react';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import toast from 'react-hot-toast';
import type { Employee, Shift } from '../types';

const EmployeeDashboard = () => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [action, setAction] = useState<'start' | 'end' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeAndShift = async () => {
      try {
        // Fetch employee data
        const employeesRef = collection(db, 'employees');
        const employeeQuery = query(employeesRef, where('id', '==', employeeId));
        const employeeSnapshot = await getDocs(employeeQuery);
        
        if (!employeeSnapshot.empty) {
          setEmployee(employeeSnapshot.docs[0].data() as Employee);
        }

        // Fetch active shift
        const shiftsRef = collection(db, 'shifts');
        const shiftQuery = query(
          shiftsRef,
          where('employeeId', '==', employeeId),
          where('status', '==', 'active')
        );
        const shiftSnapshot = await getDocs(shiftQuery);
        
        if (!shiftSnapshot.empty) {
          setActiveShift({
            id: shiftSnapshot.docs[0].id,
            ...shiftSnapshot.docs[0].data()
          } as Shift);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeAndShift();
  }, [employeeId]);

  const handleStartShift = async () => {
    if (!employee) return;
    
    try {
      if (pin !== employee.pin) {
        toast.error('Invalid PIN');
        return;
      }

      const newShift = {
        employeeId,
        departmentId: employee.departmentId,
        startTime: new Date(),
        applications: 0,
        applicationTimestamps: [],
        status: 'active'
      };

      const docRef = await addDoc(collection(db, 'shifts'), newShift);
      setActiveShift({ id: docRef.id, ...newShift } as Shift);
      toast.success('Shift started successfully');
    } catch (err) {
      console.error('Error starting shift:', err);
      toast.error('Failed to start shift');
    } finally {
      setShowPinModal(false);
      setPin('');
    }
  };

  const handleEndShift = async () => {
    if (!employee || !activeShift) return;
    
    try {
      if (pin !== employee.pin) {
        toast.error('Invalid PIN');
        return;
      }

      await updateDoc(doc(db, 'shifts', activeShift.id), {
        endTime: new Date(),
        status: 'completed'
      });

      setActiveShift(null);
      toast.success('Shift ended successfully');
    } catch (err) {
      console.error('Error ending shift:', err);
      toast.error('Failed to end shift');
    } finally {
      setShowPinModal(false);
      setPin('');
    }
  };

  const handleAddApplication = async () => {
    if (!activeShift) return;

    try {
      const updatedApplications = activeShift.applications + 1;
      const updatedTimestamps = [...activeShift.applicationTimestamps, new Date()];

      await updateDoc(doc(db, 'shifts', activeShift.id), {
        applications: updatedApplications,
        applicationTimestamps: updatedTimestamps
      });

      setActiveShift({
        ...activeShift,
        applications: updatedApplications,
        applicationTimestamps: updatedTimestamps
      });

      toast.success('Application added');
    } catch (err) {
      console.error('Error adding application:', err);
      toast.error('Failed to add application');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {employee.name}
            </h1>
            <div className="text-sm text-gray-500">
              ID: {employee.employeeId}
            </div>
          </div>

          {activeShift ? (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="font-medium">Shift Started:</span>
                  <span className="ml-2">
                    {format(new Date(activeShift.startTime), 'PPp')}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">
                    {differenceInHours(new Date(), new Date(activeShift.startTime))}h{' '}
                    {differenceInMinutes(new Date(), new Date(activeShift.startTime)) % 60}m
                  </span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddApplication}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Application ({activeShift.applications})
                </button>

                <button
                  onClick={() => {
                    setAction('end');
                    setShowPinModal(true);
                  }}
                  className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  End Shift
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setAction('start');
                setShowPinModal(true);
              }}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Clock className="h-5 w-5 mr-2" />
              Start Shift
            </button>
          )}
        </div>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Enter your PIN to {action === 'start' ? 'start' : 'end'} shift
            </h3>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter PIN"
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={action === 'start' ? handleStartShift : handleEndShift}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;