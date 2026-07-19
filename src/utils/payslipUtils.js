export function calculatePayslipTotals(data) {
  const basic = parseFloat(data.basicPay) || 0;
  const hra = parseFloat(data.hra) || 0;
  const conveyance = parseFloat(data.conveyance) || 0;
  const specialAllowance = parseFloat(data.specialAllowance) || 0;

  // Handles matches with existing pdfManager.js allowances logic if present
  const allowances = parseFloat(data.allowances) || 0;
  const breakdownSum = hra + conveyance + specialAllowance;
  const finalAllowances = allowances > 0 ? allowances : breakdownSum;

  const totalEarnings = basic + finalAllowances;

  const pf = parseFloat(data.providentFund) || 0;
  const pt = parseFloat(data.professionalTax) || 0;
  const tds = parseFloat(data.tds) || 0;
  const leaveDeduction = parseFloat(data.leaveDeduction) || 0;

  const totalDeductions = pf + pt + tds + leaveDeduction;
  const netPay = totalEarnings - totalDeductions;

  return {
    basic,
    hra,
    conveyance,
    specialAllowance,
    finalAllowances,
    totalEarnings,
    pf,
    pt,
    tds,
    leaveDeduction,
    totalDeductions,
    netPay
  };
}
