import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  doc, updateDoc, collection, addDoc, query, where, getDocs, serverTimestamp
} from 'firebase/firestore';

const Interface2 = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [clicksToday, setClicksToday] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchActiveShift = async () => {
    const q = query(collection(db, 'shifts'), where('employeeId', '==', employeeId), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    const data = snapshot.docs[0];
    if (data) {
      setShiftId(data.id);
      return data.id;
    } else {
      alert('No active shift found.');
      return null;
    }
  };

  const handleAddCount = async () => {
    if (!employeeId) return alert('Select an employee');
    setLoading(true);
    try {
      const id = shiftId || await fetchActiveShift();
      if (!id) {
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'clicks'), {
        employeeId,
        shiftId: id,
        timestamp: serverTimestamp(),
      });
      setClicksToday((prev) => prev + 1);
    } catch (error) {
      console.error('Error adding count:', error);
      alert('Error adding count');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!employeeId) return alert('Select an employee');
    setLoading(true);
    try {
      const id = shiftId || await fetchActiveShift();
      if (!id) {
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'shifts', id), {
        checkOut: serverTimestamp(),
        isActive: false,
      });
      alert('Shift closed!');
      setShiftId('');
      setClicksToday(0);
      setEmployeeId('');
    } catch (error) {
      console.error('Error closing shift:', error);
      alert('Error closing shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Active Shift</h2>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Employee ID"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAddCount} 
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            Add Count
          </button>
          <button 
            onClick={handleCloseShift}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            Close Shift
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-lg font-semibold">Today's Clicks: <span className="text-blue-600">{clicksToday}</span></p>
        </div>
      </div>
    </div>
  );
};

export default Interface2;