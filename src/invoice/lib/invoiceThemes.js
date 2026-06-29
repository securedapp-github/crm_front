export const invoiceThemes = {
  'modern-purple': {
    name: 'Modern Purple',
    headerBg: 'bg-gradient-to-r from-purple-600 to-purple-500',
    headerText: 'text-white',
    headerSubtext: 'text-white/80',
    accentColor: '#7c3aed',
    tableHeader: 'bg-purple-50 text-purple-600',
    borderColor: 'border-gray-200',
    totalBg: 'bg-purple-50',
    badgeBg: 'bg-purple-100 text-purple-700'
  },
  'apple-minimal': {
    name: 'Apple Style',
    headerBg: 'bg-white border-b border-gray-200',
    headerText: 'text-gray-900',
    headerSubtext: 'text-gray-500',
    accentColor: '#007AFF',
    tableHeader: 'bg-gray-50 text-gray-500',
    borderColor: 'border-gray-200',
    totalBg: 'bg-gray-50',
    badgeBg: 'bg-blue-100 text-blue-700'
  },
  'stripe-blue': {
    name: 'Stripe Style',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
    headerText: 'text-white',
    headerSubtext: 'text-white/70',
    accentColor: '#635BFF',
    tableHeader: 'bg-blue-50 text-blue-700',
    borderColor: 'border-blue-100',
    totalBg: 'bg-blue-50',
    badgeBg: 'bg-blue-100 text-blue-700'
  },
  'dark-minimal': {
    name: 'Minimal Black',
    headerBg: 'bg-gray-900',
    headerText: 'text-white',
    headerSubtext: 'text-gray-400',
    accentColor: '#ffffff',
    tableHeader: 'bg-gray-800 text-gray-300',
    borderColor: 'border-gray-800',
    totalBg: 'bg-gray-900 text-white',
    badgeBg: 'bg-gray-800 text-gray-300'
  },
  'luxury-gold': {
    name: 'Luxury Gold',
    headerBg: 'bg-gradient-to-r from-amber-800 to-yellow-600',
    headerText: 'text-white',
    headerSubtext: 'text-amber-100',
    accentColor: '#D97706',
    tableHeader: 'bg-amber-50 text-amber-800',
    borderColor: 'border-amber-200',
    totalBg: 'bg-amber-50',
    badgeBg: 'bg-amber-100 text-amber-800'
  },
  'notion-minimal': {
    name: 'Notion Style',
    headerBg: 'bg-white border-b-2 border-gray-900',
    headerText: 'text-gray-900',
    headerSubtext: 'text-gray-400',
    accentColor: '#111827',
    tableHeader: 'bg-white border-b-2 border-gray-200 text-gray-500',
    borderColor: 'border-gray-100',
    totalBg: 'bg-gray-50',
    badgeBg: 'bg-gray-100 text-gray-700'
  }
};

export function getTheme(name) {
  return invoiceThemes[name] || invoiceThemes['modern-purple'];
}
