import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Device } from '../types';
import { signInAnonymously } from 'firebase/auth';

interface DeviceAuthProps {
  children: React.ReactNode;
}

const DeviceAuth: React.FC<DeviceAuthProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkDeviceAuth = async () => {
      try {
        // First ensure we have an authenticated user, even if anonymous
        await signInAnonymously(auth);

        // Get device info
        const deviceInfo = {
          name: navigator.userAgent,
          ip: await fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip),
          browser: navigator.userAgent,
          createdAt: new Date(),
        };

        // Check if device exists and is authorized
        const devicesRef = collection(db, 'devices');
        const q = query(devicesRef, where('ip', '==', deviceInfo.ip));
        
        try {
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            // Device not found, request authorization
            await addDoc(devicesRef, {
              ...deviceInfo,
              status: 'pending',
              lastAccessed: new Date(),
            });
            setIsAuthorized(false);
          } else {
            const device = querySnapshot.docs[0].data() as Device;
            setIsAuthorized(device.status === 'approved');
          }
        } catch (firestoreError) {
          console.error('Firestore operation failed:', firestoreError);
          // Handle the error gracefully but don't throw
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Error in device authorization process:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkDeviceAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">Access Restricted</h1>
          <p className="text-gray-600 text-center">
            This device is not authorized to access the application. Please contact your administrator for approval.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DeviceAuth;