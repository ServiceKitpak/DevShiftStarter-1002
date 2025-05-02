import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, where, Timestamp, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ClipboardList, LogOut, ChevronDown, ChevronUp, Calendar, Users, Shield, ShieldOff } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';

interface Shift {
  id: string;
  employeeId: string;
  checkIn: { seconds: number };
  checkOut?: { seconds: number };
  isActive: boolean;
}

interface Click {
  id: string;
  timestamp: { seconds: number };
  shiftId: string;
}

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  sdwo: string;
  mobile: string;
  cnic: string;
  email: string;
  address: string;
  reference: string;
  salary: number;
  status: string;
  bankDetails: {
    bank: string;
    title: string;
    accountNumber: string;
  };
  designation: string;
  role: 'employee' | 'admin' | 'super admin';
  pin: string;
}

interface ClicksByShift {
  [key: string]: Click[];
}

interface WeeklyHours {
  [employeeId: string]: number;
}

interface Connection {
  id: string;
  deviceName: string;
  browser: string;
  ip: string;
  isBlocked: boolean;
  lastSeen: string;
}

interface Props {
  activeTab: string;
}

const AdminViewer: React.FC<Props> = ({ activeTab }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weeklyShifts, setWeeklyShifts] = useState<Shift[]>([]);
  const [clicksByShift, setClicksByShift] = useState<ClicksByShift>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedReportEmployee, setSelectedReportEmployee] = useState<string>('all');
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: '1',
      deviceName: 'Windows PC',
      browser: 'Chrome',
      ip: '192.168.1.100',
      isBlocked: false,
      lastSeen: new Date().toISOString()
    },
    {
      id: '2',
      deviceName: 'MacBook Pro',
      browser: 'Safari',
      ip: '192.168.1.101',
      isBlocked: true,
      lastSeen: new Date().toISOString()
    }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const selectedDateObj = new Date(selectedDate);
    const startOfDay = new Date(selectedDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const shiftsQuery = query(
      collection(db, 'shifts'),
      where('checkIn', '>=', Timestamp.fromDate(startOfDay)),
      where('checkIn', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('checkIn', 'desc')
    );

    const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shift[];
      setShifts(shiftsData);
      setLoading(false);
    });

    return () => unsubShifts();
  }, [selectedDate]);

  useEffect(() => {
    const employeesQuery = query(collection(db, 'employees'), orderBy('name'));
    const unsubEmployees = onSnapshot(employeesQuery, (snapshot) => {
      const employeesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(employeesData);
    });
    return () => unsubEmployees();
  }, []);

  useEffect(() => {
    const clicksQuery = query(collection(db, 'clicks'), orderBy('timestamp', 'asc'));
    const unsubClicks = onSnapshot(clicksQuery, (snapshot) => {
      const grouped: ClicksByShift = {};
      snapshot.docs.forEach(doc => {
        const click = { id: doc.id, ...doc.data() } as Click;
        grouped[click.shiftId] = grouped[click.shiftId] || [];
        grouped[click.shiftId].push(click);
      });
      setClicksByShift(grouped);
    });
    return () => unsubClicks();
  }, []);

  useEffect(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyShiftsQuery = query(
      collection(db, 'shifts'),
      where('checkIn', '>=', Timestamp.fromDate(startOfWeek)),
      orderBy('checkIn', 'desc')
    );

    const unsubWeeklyShifts = onSnapshot(weeklyShiftsQuery, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Shift[];
      setWeeklyShifts(shiftsData);
    });

    return () => unsubWeeklyShifts();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDuration = (start: number, end: number) => {
    const duration = end - start;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const calculateShiftDuration = (shift: Shift) => {
    const end = shift.isActive ? currentTime / 1000 : (shift.checkOut?.seconds || 0);
    return formatDuration(shift.checkIn.seconds, end);
  };

  const calculateWeeklyHours = (): WeeklyHours => {
    return weeklyShifts.reduce((acc, shift) => {
      const end = shift.checkOut?.seconds || currentTime / 1000;
      const duration = end - shift.checkIn.seconds;
      acc[shift.employeeId] = (acc[shift.employeeId] || 0) + duration;
      return acc;
    }, {} as WeeklyHours);
  };

  const calculateClicksPerHour = (shift: Shift) => {
    const clicksCount = clicksByShift[shift.id]?.length || 0;
    const end = shift.checkOut?.seconds || currentTime / 1000;
    const hours = (end - shift.checkIn.seconds) / 3600;
    return hours > 0 ? (clicksCount / hours).toFixed(1) : '0.0';
  };

  const calculateClickDurations = (clicks: Click[]) => {
    return clicks.map((click, index) => ({
      ...click,
      duration: index > 0 
        ? formatDuration(clicks[index - 1].timestamp.seconds, click.timestamp.seconds)
        : '—'
    }));
  };

  const toggleBlockIP = (connectionId: string) => {
    setConnections(prev =>
      prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, isBlocked: !conn.isBlocked }
          : conn
      )
    );
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const employeeData = {
      employeeId: formData.get('employeeId'),
      name: formData.get('name'),
      sdwo: formData.get('sdwo'),
      mobile: formData.get('mobile'),
      cnic: formData.get('cnic'),
      email: formData.get('email'),
      address: formData.get('address'),
      reference: formData.get('reference'),
      salary: Number(formData.get('salary')),
      status: formData.get('status'),
      bankDetails: {
        bank: formData.get('bank'),
        title: formData.get('title'),
        accountNumber: formData.get('accountNumber')
      },
      designation: formData.get('designation'),
      role: formData.get('role'),
      pin: selectedEmployee?.pin || Math.random().toString().slice(-4)
    };

    try {
      if (selectedEmployee?.id) {
        await updateDoc(doc(db, 'employees', selectedEmployee.id), employeeData);
      } else {
        await addDoc(collection(db, 'employees'), employeeData);
      }
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleChangePin = async () => {
    if (selectedEmployee && newPin) {
      try {
        await updateDoc(doc(db, 'employees', selectedEmployee.id), {
          pin: newPin
        });
        setShowPinModal(false);
        setNewPin('');
      } catch (error) {
        console.error('Error updating PIN:', error);
      }
    }
  };

  const renderEmployeesSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Employee Management</h2>
          <button
            onClick={() => setSelectedEmployee({
              id: '',
              employeeId: '',
              name: '',
              sdwo: '',
              mobile: '',
              cnic: '',
              email: '',
              address: '',
              reference: '',
              salary: 0,
              status: 'active',
              bankDetails: { bank: '', title: '', accountNumber: '' },
              designation: '',
              role: 'employee',
              pin: ''
            })}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add New Employee
          </button>
        </div>

        {selectedEmployee && (
          <form onSubmit={handleSaveEmployee} className="bg-gray-50 p-6 rounded-lg mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="employeeId" placeholder="Employee ID" defaultValue={selectedEmployee.employeeId} required 
                className="border p-2 rounded-md"/>
              <input name="name" placeholder="Full Name" defaultValue={selectedEmployee.name} required 
                className="border p-2 rounded-md"/>
              <select name="sdwo" defaultValue={selectedEmployee.sdwo} required 
                className="border p-2 rounded-md bg-white">
                <option value="">Select S/D/W/O</option>
                <option value="S">Single</option>
                <option value="D">Divorced</option>
                <option value="W">Widowed</option>
                <option value="O">Other</option>
              </select>
              <input name="mobile" placeholder="Mobile" defaultValue={selectedEmployee.mobile} required 
                className="border p-2 rounded-md"/>
              <input name="cnic" placeholder="CNIC" defaultValue={selectedEmployee.cnic} required 
                className="border p-2 rounded-md"/>
              <input name="email" type="email" placeholder="Email" defaultValue={selectedEmployee.email} required 
                className="border p-2 rounded-md"/>
              <input name="address" placeholder="Address" defaultValue={selectedEmployee.address} required 
                className="border p-2 rounded-md"/>
              <input name="reference" placeholder="Reference" defaultValue={selectedEmployee.reference} 
                className="border p-2 rounded-md"/>
              <input name="salary" type="number" placeholder="Salary" defaultValue={selectedEmployee.salary} required 
                className="border p-2 rounded-md"/>
              <select name="status" defaultValue={selectedEmployee.status} className="border p-2 rounded-md bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select name="role" defaultValue={selectedEmployee.role} className="border p-2 rounded-md bg-white">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="super admin">Super Admin</option>
              </select>
              <input name="designation" placeholder="Designation" defaultValue={selectedEmployee.designation} required 
                className="border p-2 rounded-md"/>
              <div className="space-y-2 col-span-full">
                <h4 className="font-medium">Bank Details</h4>
                <input name="bank" placeholder="Bank Name" defaultValue={selectedEmployee.bankDetails.bank} required 
                  className="border p-2 rounded-md w-full"/>
                <input name="title" placeholder="Account Title" defaultValue={selectedEmployee.bankDetails.title} required 
                  className="border p-2 rounded-md w-full"/>
                <input name="accountNumber" placeholder="Account Number" 
                  defaultValue={selectedEmployee.bankDetails.accountNumber} required 
                  className="border p-2 rounded-md w-full"/>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="bg-gray-200 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Save Employee
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Employee ID</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map(employee => (
                <tr key={employee.id}>
                  <td className="p-3">{employee.name}</td>
                  <td className="p-3">{employee.employeeId}</td>
                  <td className="p-3 capitalize">{employee.role}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => setSelectedEmployee(employee)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowPinModal(true);
                      }}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      View PIN
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowPinModal(true);
                        setNewPin('');
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      Change PIN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPinModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg space-y-4 min-w-[400px]">
            <h3 className="text-lg font-semibold">PIN Management</h3>
            <p>Current PIN: {selectedEmployee.pin}</p>
            <input
              type="password"
              placeholder="New PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="border p-2 w-full rounded-md"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setNewPin('');
                }}
                className="bg-gray-200 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePin}
                className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                disabled={!newPin}
              >
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportsSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Employee Reports</h2>
          <div className="flex gap-4">
            <select
              value={selectedReportEmployee}
              onChange={(e) => setSelectedReportEmployee(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5"
            >
              <option value="all">All Employees</option>
              {Object.keys(calculateWeeklyHours()).map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'weekly' | 'monthly')}
              className="border border-gray-300 rounded-md px-3 py-1.5"
            >
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">
            {reportType === 'weekly' ? 'Weekly' : 'Monthly'} Summary
          </h3>
          {selectedReportEmployee === 'all' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(calculateWeeklyHours()).map(([empId, seconds]) => (
                <div key={empId} className="bg-white p-4 rounded-lg shadow">
                  <h4 className="font-medium">{empId}</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {(seconds / 3600).toFixed(1)} hours
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-medium mb-2">{selectedReportEmployee}</h4>
              <p className="text-3xl font-bold text-blue-600">
                {(calculateWeeklyHours()[selectedReportEmployee] || 0) / 3600} hours
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderConnectionsSection = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-6">Connected Devices</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {connections.map((connection) => (
                <tr key={connection.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{connection.deviceName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{connection.browser}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{connection.ip}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(connection.lastSeen), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      connection.isBlocked
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {connection.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleBlockIP(connection.id)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                        connection.isBlocked
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {connection.isBlocked ? (
                        <>
                          <Shield className="h-4 w-4" />
                          Unblock
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-4 w-4" />
                          Block
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activeTab === 'employees') {
    return renderEmployeesSection();
  }

  if (activeTab === 'reports') {
    return renderReportsSection();
  }

  if (activeTab === 'connections') {
    return renderConnectionsSection();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Weekly Hours Summary</h3>
        </div>
        <div className="flex gap-4 items-start">
          <select
            value={selectedReportEmployee}
            onChange={(e) => setSelectedReportEmployee(e.target.value)}
            className="w-64 border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="all">All Employees</option>
            {Object.keys(calculateWeeklyHours()).map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <div className="flex-1 bg-gray-50 p-4 rounded-lg">
            {selectedReportEmployee === 'all' ? (
              <div className="space-y-2">
                {Object.entries(calculateWeeklyHours()).map(([empId, seconds]) => (
                  <div key={empId} className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                    <span className="font-medium">{empId}</span>
                    <span className={`${seconds < 172800 ? 'text-red-600' : 'text-gray-600'}`}>
                      {(seconds / 3600).toFixed(1)} hours
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <h4 className="text-lg font-medium">{selectedReportEmployee}</h4>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {((calculateWeeklyHours()[selectedReportEmployee] || 0) / 3600).toFixed(1)} hours
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Employee ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Check-In</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Check-Out</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Shift Hours</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Clicks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Clicks/Hour</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.map((shift) => (
                <React.Fragment key={shift.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{shift.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(shift.checkIn.seconds * 1000).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {shift.checkOut?.seconds 
                        ? new Date(shift.checkOut.seconds * 1000).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shift.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {shift.isActive ? 'Active' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {calculateShiftDuration(shift)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {clicksByShift[shift.id]?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                      {calculateClicksPerHour(shift)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        {expandedShift === shift.id ? (
                          <>
                            Hide Details
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            View Details
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedShift === shift.id && clicksByShift[shift.id]?.length > 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-3 bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="w-full table-auto border-collapse">
                            <thead>
                              <tr className="text-xs text-gray-500">
                                <th className="px-4 py-2 text-left">Click Time</th>
                                <th className="px-4 py-2 text-left">Time Since Last Click</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {calculateClickDurations(clicksByShift[shift.id]).map((click) => (
                                <tr key={click.id} className="text-sm">
                                  <td className="px-4 py-2 text-gray-600">
                                    {new Date(click.timestamp.seconds * 1000).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-gray-600">{click.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
  );
};

export default AdminViewer;