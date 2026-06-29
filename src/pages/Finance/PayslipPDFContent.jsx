import React from 'react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayslipPDFContent({ data, user, business }) {
  const basic = parseFloat(data.basicPay || 0);
  const allowances = parseFloat(data.allowances || 0);
  const deductions = parseFloat(data.deductions || 0);
  const netPay = (basic + allowances) - deductions;
  const monthName = MONTHS[(parseInt(data.month) || 1) - 1];
  
  return (
    <div className="bg-white text-gray-900 p-8 font-sans" style={{ width: '800px', minHeight: '1000px' }}>
      {/* Header */}
      <div className="border-b-2 border-emerald-600 pb-6 mb-6 flex justify-between items-start">
        <div>
          {business?.logo_url ? (
            <img src={business.logo_url} alt="Logo" className="h-12 mb-2 object-contain" />
          ) : (
            <h1 className="text-2xl font-bold text-emerald-800 uppercase tracking-wide">{business?.company_name || 'Your Company'}</h1>
          )}
          <p className="text-sm text-gray-500 mt-1">{business?.address_line1 || '123 Business Avenue, Tech Park'}</p>
          <p className="text-sm text-gray-500">{business?.city || 'City'}, {business?.state || 'State'}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-800 tracking-tight">PAYSLIP</h2>
          <p className="text-emerald-700 font-semibold mt-1">For {monthName} {data.year}</p>
        </div>
      </div>

      {/* Employee Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Employee Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex"><span className="w-32 text-gray-500">Employee Name:</span> <span className="font-medium">{user?.name || 'Employee Name'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">Employee ID:</span> <span className="font-medium">{data.employeeId || 'EMP-001'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">Designation:</span> <span className="font-medium">{data.designation || 'Staff'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">Department:</span> <span className="font-medium">{data.department || 'General'}</span></div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Bank Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex"><span className="w-32 text-gray-500">Bank Name:</span> <span className="font-medium">{data.bankName || '-'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">Account No:</span> <span className="font-medium">{data.accountNumber || '-'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">IFSC Code:</span> <span className="font-medium">{data.ifscCode || '-'}</span></div>
            <div className="flex"><span className="w-32 text-gray-500">PAN Number:</span> <span className="font-medium">{data.panNumber || '-'}</span></div>
          </div>
        </div>
      </div>

      {/* Salary Details */}
      <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="border-r border-gray-200">
          <div className="bg-emerald-50 px-4 py-3 border-b border-gray-200 font-semibold text-emerald-800">Earnings</div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Basic Pay</span>
              <span className="font-medium">${basic.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Allowances</span>
              <span className="font-medium">${allowances.toFixed(2)}</span>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 flex justify-between bg-gray-50 font-semibold h-full mt-4">
            <span>Total Earnings</span>
            <span>${(basic + allowances).toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="bg-red-50 px-4 py-3 border-b border-gray-200 font-semibold text-red-800">Deductions</div>
          <div className="p-4 space-y-3 text-sm flex-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Provident Fund / Tax</span>
              <span className="font-medium">${deductions.toFixed(2)}</span>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 flex justify-between bg-gray-50 font-semibold">
            <span>Total Deductions</span>
            <span>${deductions.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Net Salary */}
      <div className="bg-emerald-600 text-white p-6 rounded-lg flex justify-between items-center mb-8">
        <div>
          <p className="text-emerald-100 text-sm uppercase tracking-wider mb-1">Net Salary Payable</p>
          <p className="text-3xl font-bold">${netPay.toFixed(2)}</p>
        </div>
        <div className="text-right max-w-[200px]">
          <p className="text-sm text-emerald-100 opacity-90 italic">This is a computer generated document and does not require a signature.</p>
        </div>
      </div>
      
      {data.remarks && (
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">Remarks:</span> {data.remarks}
        </div>
      )}
    </div>
  );
}
