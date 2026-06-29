export const invoiceThemes = {
  'securedapp-green': {
    name: 'SecuredApp Green',
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    headerSubtext: 'text-white/80',
    accentColor: '#10b981',
    tableHeader: 'bg-emerald-50 text-emerald-700',
    borderColor: 'border-emerald-200',
    totalBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100 text-emerald-700'
  }
};

export function getTheme(name) {
  return invoiceThemes[name] || invoiceThemes['securedapp-green'];
}
