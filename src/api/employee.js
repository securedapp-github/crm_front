import { api } from './auth'

const validateEmployeeShape = (data) => {
  if (!data || typeof data !== 'object') return null;
  return {
    id: data.id || '',
    name: data.name || '',
    email: data.email || '',
    role: data.role || 'user',
    employeeId: data.employeeId || '',
    department: data.department || '',
    designation: data.designation || '',
    joinDate: data.joinDate || '',
    basicPay: Number(data.basicPay) || 0,
    bankName: data.bankName || '',
    accountNumber: data.accountNumber || '',
    ifscCode: data.ifscCode || '',
    panNumber: data.panNumber || '',
    uan: data.uan || '',
    pfNumber: data.pfNumber || '',
    contactNumber: data.contactNumber || '',
    reportingManager: data.reportingManager || '',
    officeLocation: data.officeLocation || '',
    employmentType: data.employmentType || '',
    employmentStatus: data.employmentStatus || '',
    lastWorkingDay: data.lastWorkingDay || '',
    reasonForLeaving: data.reasonForLeaving || '',
    personalAddress: data.personalAddress || '',
    personalEmail: data.personalEmail || '',
    emergencyContactName: data.emergencyContactName || '',
    emergencyContactRelationship: data.emergencyContactRelationship || '',
    emergencyContactPhone: data.emergencyContactPhone || '',
    dateOfBirth: data.dateOfBirth || '',
    aadhaarNumber: data.aadhaarNumber || '',
    passportNumber: data.passportNumber || '',
    variablePay: Number(data.variablePay) || 0,
    appraisalCycle: data.appraisalCycle || '',
    consentLogId: data.consentLogId || '',
    isActive: !!data.isActive,
    payslips: Array.isArray(data.payslips) ? data.payslips : [],
    leaveRequests: Array.isArray(data.leaveRequests) ? data.leaveRequests : []
  };
};

export const getEmployees = (params) => 
  api.get('/employees', { params })
    .then(res => {
      if (res.data && Array.isArray(res.data.data)) {
        res.data.data = res.data.data.map(validateEmployeeShape).filter(Boolean);
      }
      return res;
    });

export const getEmployeeById = (id) => 
  api.get(`/employees/${id}`)
    .then(res => {
      if (res.data && res.data.data) {
        res.data.data = validateEmployeeShape(res.data.data);
      }
      return res;
    });

export const createEmployee = (data) => api.post('/employees', data)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const toggleEmployeeStatus = (id) => api.patch(`/employees/${id}/status`)
