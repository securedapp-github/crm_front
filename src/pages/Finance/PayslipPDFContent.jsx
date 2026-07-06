import React from 'react';
import { getFullFileUrl } from '@/invoice/lib/invoiceUtils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayslipPDFContent({ data, user, business }) {
  const basic = parseFloat(data.basicPay || 0);
  const hra = parseFloat(data.hra || 0);
  const conveyance = parseFloat(data.conveyance || 0);
  const specialAllowance = parseFloat(data.specialAllowance || 0);
  const totalEarnings = basic + hra + conveyance + specialAllowance;
  const pf = parseFloat(data.providentFund || 0);
  const pt = parseFloat(data.professionalTax || 0);
  const tds = parseFloat(data.tds || 0);
  const totalDeductions = pf + pt + tds;
  const netPay = totalEarnings - totalDeductions;
  const monthName = MONTHS[(parseInt(data.month) || 1) - 1];
  
  return (
    <div className="bg-white text-black p-8 font-sans mx-auto" style={{ width: '800px', minHeight: '1000px' }}>
      
      {/* Header */}
      <div className="relative mb-8 mt-4">
        <div className="absolute top-0 left-0">
          {business?.logo_url ? (
            <img src={getFullFileUrl(business.logo_url)} alt="Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs">Logo</div>
          )}
        </div>
        <div className="text-center w-full pt-2">
          <h1 className="text-4xl mb-2 text-black font-normal">{data.companyName || business?.company_name || 'Company Demo'}</h1>
          <p className="text-sm text-black">{data.addressLine1 || business?.address_line1 || 'Bhulbhulaiya,Double trouble'}</p>
          <p className="text-sm text-black">{data.city || business?.city || 'Bengaluru'}, {data.state || business?.state || 'Karnataka'}, IN - {data.pincode || business?.pincode || '560048'}</p>
        </div>
      </div>

      <div className="text-center font-bold text-sm mb-6">
        Payslip for the month of {monthName}, {data.year}
      </div>

      {/* Employee Details Box */}
      <div className="border border-black mb-6 flex text-sm">
        <div className="w-1/2 p-3 border-r border-black">
          <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Name:</div>
            <div>{user?.name || '-'}</div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Designation:</div>
            <div>{data.designation || user?.designation || '-'}</div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Department:</div>
            <div>{data.department || user?.department || '-'}</div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Location:</div>
            <div>{business?.city || '-'}</div>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">LOP:</div>
            <div>0.0</div>
          </div>
          {(data.uan || user?.uan) && (
            <div className="grid grid-cols-[140px_1fr] gap-1 mb-1.5">
              <div className="font-semibold">UAN:</div>
              <div>{data.uan || user?.uan}</div>
            </div>
          )}
        </div>
        
        <div className="w-1/2 p-3">
          <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Employee ID:</div>
            <div>{data.employeeId || user?.employeeId || '-'}</div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Bank Name:</div>
            <div>{data.bankName || user?.bankName || '-'}</div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">Bank Account Number:</div>
            <div>{data.accountNumber || user?.accountNumber || '-'}</div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">PAN:</div>
            <div>{data.panNumber || user?.panNumber || '-'}</div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
            <div className="font-semibold">IFSC Code:</div>
            <div>{data.ifscCode || user?.ifscCode || '-'}</div>
          </div>
          {(data.pfNumber || user?.pfNumber) && (
            <div className="grid grid-cols-[180px_1fr] gap-1 mb-1.5">
              <div className="font-semibold">PF Number:</div>
              <div>{data.pfNumber || user?.pfNumber}</div>
            </div>
          )}
        </div>
      </div>

      {/* Salary Table */}
      <div className="border border-black text-sm mb-6">
        {/* Table Header */}
        <div className="flex border-b border-black font-semibold">
          <div className="w-1/2 flex border-r border-black px-3 py-2">
            <div className="w-2/3">Earnings</div>
            <div className="w-1/3 text-right">Amount</div>
          </div>
          <div className="w-1/2 flex px-3 py-2">
            <div className="w-2/3">Deductions</div>
            <div className="w-1/3 text-right">Amount</div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="flex min-h-[180px]">
          {/* Earnings Column */}
          <div className="w-1/2 border-r border-black p-3 flex flex-col gap-2">
            <div className="flex justify-between">
              <div>Basic</div>
              <div>₹ {basic.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="flex justify-between">
              <div>HRA</div>
              <div>₹ {hra.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="flex justify-between">
              <div>Conveyance</div>
              <div>₹ {conveyance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="flex justify-between">
              <div>Special Allowance</div>
              <div>₹ {specialAllowance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
          </div>
          
          {/* Deductions Column */}
          <div className="w-1/2 p-3 flex flex-col gap-2">
            <div className="flex justify-between">
              <div>Income Tax</div>
              <div>₹ {tds.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="flex justify-between">
              <div>Provident Fund</div>
              <div>₹ {pf.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div className="flex justify-between">
              <div>Professional Tax</div>
              <div>₹ {pt.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
          </div>
        </div>
        
        {/* Table Footer */}
        <div className="flex border-t border-black font-semibold">
          <div className="w-1/2 flex border-r border-black p-3">
            <div className="w-2/3">Total Earnings</div>
            <div className="w-1/3 text-right">{totalEarnings.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </div>
          <div className="w-1/2 flex p-3">
            <div className="w-2/3">Total Deductions</div>
            <div className="w-1/3 text-right">{totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          </div>
        </div>
      </div>

      {/* Net Pay */}
      <div className="text-sm mb-10">
        <span className="font-semibold">Net Pay for the month: ₹ {netPay.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
      </div>

      <hr className="border-t border-gray-300 mb-8" />

      {/* Footer text */}
      <div className="text-center text-sm space-y-8">
        <p>This is a system generated payslip and does not require signature.</p>
        
        <div>
          <p>Generated by {business?.company_name || 'Our Company'}</p>
        </div>
      </div>
      
    </div>
  );
}
