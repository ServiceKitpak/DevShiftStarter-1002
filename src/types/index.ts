export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  parentName: string;
  mobile: string;
  cnic: string;
  email: string;
  address: string;
  reference: string;
  salary: number;
  status: 'active' | 'inactive';
  bankDetails: {
    bank: string;
    title: string;
    accountNumber: string;
  };
  designation: string;
  role: 'employee' | 'admin' | 'super_admin';
  departmentId: string;
  pin: string;
}

export interface Department {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Shift {
  id: string;
  employeeId: string;
  departmentId: string;
  startTime: Date;
  endTime?: Date;
  applications: number;
  applicationTimestamps: Date[];
  status: 'active' | 'completed';
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  browser: string;
  status: 'pending' | 'approved' | 'blocked';
  lastAccessed: Date;
}

export interface Overtime {
  id: string;
  employeeId: string;
  date: Date;
  hours: number;
  rate: number;
  description: string;
  amount: number;
}