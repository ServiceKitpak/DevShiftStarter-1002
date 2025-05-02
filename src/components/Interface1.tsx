import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  doc,
  updateDoc,
  documentId
} from 'firebase/firestore';
import { UserPlus, AlertCircle, Loader2, Timer, XCircle, Plus } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  department: string;
  pin: string;
}

interface ActiveShift {
  id: string;
  employeeId: string;
  checkIn: { seconds: number };
  clicks: number;
}

const Interface1 = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [clicksCount, setClicksCount] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Always fetch all employees (security rules will enforce permissions)
        const q = query(collection(db, 'employees'));
        const snapshot = await getDocs(q);
        
        const employeesData: Employee[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name || 'Unnamed',
          department: docSnap.data().designation || 'Unknown',
          pin: docSnap.data().pin || '',
        }));
  
        setEmployees(employeesData);
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employee list');
      }
    };
  
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchActiveShift(employeeId);
    }
  }, [employeeId]);

  const fetchActiveShift = async (empId: string) => {
    try {
      const q = query(
        collection(db, 'shifts'),
        where('employeeId', '==', empId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const shiftData = snapshot.docs[0];
        setActiveShift({
          id: shiftData.id,
          ...shiftData.data() as Omit<ActiveShift, 'id'>
        });
        
        const clicksQuery = query(
          collection(db, 'clicks'),
          where('shiftId', '==', shiftData.id)
        );
        const clicksSnapshot = await getDocs(clicksQuery);
        setClicksCount(clicksSnapshot.size);
      } else {
        setActiveShift(null);
        setClicksCount(0);
      }
    } catch (err) {
      console.error('Error fetching active shift:', err);
      setError('Failed to fetch shift data');
    }
  };

  const verifyPin = () => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
      setError('Employee not found');
      return false;
    }
    if (pin !== employee.pin) {
      setError('Invalid PIN');
      return false;
    }
    return true;
  };

  const handleCheckIn = async () => {
    if (!employeeId) {
      setError('Please select an employee');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!verifyPin()) return;

      const hasActiveShift = await checkExistingShift(employeeId);
      if (hasActiveShift) {
        setError('Active shift already exists');
        return;
      }

      await addDoc(collection(db, 'shifts'), {
        employeeId,
        checkIn: serverTimestamp(),
        isActive: true,
        startedAt: new Date().toISOString(),
      });

      setSuccess(true);
      setPin('');
      await fetchActiveShift(employeeId);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to start shift');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!verifyPin()) return;

      await updateDoc(doc(db, 'shifts', activeShift.id), {
        checkOut: serverTimestamp(),
        isActive: false,
      });

      setActiveShift(null);
      setClicksCount(0);
      setSuccess(true);
      setPin('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error ending shift:', err);
      setError('Failed to end shift');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingShift = async (empId: string) => {
    const q = query(
      collection(db, 'shifts'),
      where('employeeId', '==', empId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleAddClick = async () => {
    if (!activeShift) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'clicks'), {
        employeeId,
        shiftId: activeShift.id,
        timestamp: serverTimestamp(),
      });
      setClicksCount(prev => prev + 1);
    } catch (err) {
      console.error('Error adding click:', err);
      setError('Failed to add click');
    } finally {
      setLoading(false);
    }
  };

  const getActiveEmployee = () => {
    return employees.find(emp => emp.id === employeeId);
  };

  const formatDuration = (startSeconds: number) => {
    const duration = Math.floor((Date.now() / 1000) - startSeconds);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Shift Management</h2>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="employee" className="text-sm font-medium text-gray-700">
            Select Employee
          </label>
          <select
            id="employee"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPin('');
              setError(null);
            }}
            className="flex-1 border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            disabled={loading}
          >
            <option value="">Choose an employee...</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} - {emp.department}
              </option>
            ))}
          </select>
        </div>

        {employeeId && (
          <div className="flex flex-col gap-2">
            <label htmlFor="pin" className="text-sm font-medium text-gray-700">
              {activeShift ? 'Enter PIN to End Shift' : 'Enter PIN to Start Shift'}
            </label>
            <input
              type="password"
              id="pin"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              className="flex-1 border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              disabled={loading}
              placeholder="Enter 4-digit PIN"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
            <span className="text-sm">✓ Action completed successfully!</span>
          </div>
        )}

        {activeShift ? (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Active Shift</span>
              </div>
              <span className="text-sm text-gray-600">
                Duration: {formatDuration(activeShift.checkIn.seconds)}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-t border-gray-200">
              <div>
                <p className="font-medium">{getActiveEmployee()?.name}</p>
                <p className="text-sm text-gray-600">{getActiveEmployee()?.department}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Clicks</p>
                <p className="text-2xl font-bold text-blue-600">{clicksCount}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddClick}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Click
              </button>
              <button
                onClick={handleEndShift}
                disabled={loading || !pin}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle className="h-5 w-5" />
                End Shift
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={loading || !employeeId || !pin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Start Shift
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default Interface1;