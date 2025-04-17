import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Device } from '../types';

const DeviceManagement = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDevices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'devices'));
      const deviceList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Device));
      setDevices(deviceList);
    } catch (err) {
      console.error('Error fetching devices:', err);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleStatusChange = async (deviceId: string, status: 'approved' | 'blocked') => {
    try {
      await updateDoc(doc(db, 'devices', deviceId), {
        status,
        lastAccessed: new Date()
      });
      toast.success(`Device ${status === 'approved' ? 'approved' : 'blocked'} successfully`);
      fetchDevices();
    } catch (err) {
      console.error('Error updating device status:', err);
      toast.error('Failed to update device status');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      await deleteDoc(doc(db, 'devices', deviceId));
      toast.success('Device deleted successfully');
      fetchDevices();
    } catch (err) {
      console.error('Error deleting device:', err);
      toast.error('Failed to delete device');
    }
  };

  const approveSpecificIP = async () => {
    try {
      // Check if device with IP already exists
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, where('ip', '==', '139.135.36.110'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new device entry
        await addDoc(devicesRef, {
          name: 'Manually Approved Device',
          ip: '192.168.18.69',
          browser: 'Manual Entry',
          status: 'approved',
          lastAccessed: new Date(),
          createdAt: new Date()
        });
        toast.success('IP address 192.168.18.69 has been approved');
      } else {
        // Update existing device
        const deviceDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'devices', deviceDoc.id), {
          status: 'approved',
          lastAccessed: new Date()
        });
        toast.success('IP address 192.168.18.69 has been approved');
      }
      fetchDevices();
    } catch (err) {
      console.error('Error approving IP:', err);
      toast.error('Failed to approve IP address');
    }
  };

  useEffect(() => {
    // Automatically approve the specific IP when component mounts
    approveSpecificIP();
  }, []); // Run once on mount

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Device Management</h1>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Device Name</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">IP Address</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Browser</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Last Accessed</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                      {device.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {device.ip}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {device.browser}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        device.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : device.status === 'blocked'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {device.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(device.lastAccessed).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right space-x-2">
                      {device.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(device.id, 'approved')}
                          className="text-green-600 hover:text-green-800"
                          title="Approve Device"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                      {device.status !== 'blocked' && (
                        <button
                          onClick={() => handleStatusChange(device.id, 'blocked')}
                          className="text-red-600 hover:text-red-800"
                          title="Block Device"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(device.id)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Delete Device"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManagement;