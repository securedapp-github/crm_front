import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/invoice/lib/query-client'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Marketing from './pages/Marketing/Marketing'
import DashboardHome from './pages/DashboardHome'
import Pipeline from './pages/Sales/Pipeline'
import DealDetail from './pages/Sales/DealDetail'
import SalesDashboard from './pages/Sales/SalesDashboard'
import CompletedDeals from './pages/Sales/CompletedDeals'
import SalesMail from './pages/Sales/SalesMail'
import DeletedDeals from './pages/Sales/DeletedDeals'
import Tickets from './pages/Service/Tickets'
import Notes from './pages/Collaboration/Notes'
import SalesTeam from './pages/Teams/SalesTeam'
import SalesPersonDetails from './pages/Teams/SalesPersonDetails'
import MarketingTeam from './pages/Teams/MarketingTeam'
import GrowthTeam from './pages/Teams/GrowthTeam'
import OperationsTeam from './pages/Teams/OperationsTeam'
import TechTeam from './pages/Teams/TechTeam'
import HRTeam from './pages/Teams/HRTeam'
import { ToastProvider } from './components/ToastProvider'
import TeamMemberDetail from './components/TeamMemberDetail'
import Settings from './pages/Settings'
import CompanyAssets from './pages/CompanyAssets'
import ActivitiesPage from './pages/Marketing/ActivitiesPage'
import SalesMarketingActivities from './pages/Sales/SalesMarketingActivities'
import EmailSequences from './pages/Marketing/EmailSequences'
import CreateSequence from './pages/Marketing/CreateSequence'
import SequenceBuilder from './pages/Marketing/SequenceBuilder'
import InvoiceDashboard from '@/invoice/pages/Dashboard'
import Invoices from '@/invoice/pages/Invoices'
import InvoiceForm from '@/invoice/pages/InvoiceForm'
import InvoiceView from '@/invoice/pages/InvoiceView'
import PublicInvoice from '@/invoice/pages/PublicInvoice'
import InvoiceCustomers from '@/invoice/pages/Customers'
import InvoicePayments from '@/invoice/pages/Payments'
import InvoiceProducts from '@/invoice/pages/Products'
import InvoiceSettings from '@/invoice/pages/Settings'
import InvoiceLayout from '@/invoice/components/InvoiceLayout'
import FinanceHub from './pages/Finance/FinanceHub'
import PayslipGenerator from './pages/Finance/PayslipGenerator'


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ToastProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="marketing" element={<Marketing />} />
              <Route path="sales" element={<Pipeline />} />
              <Route path="sales-dashboard" element={<SalesDashboard />} />
              <Route path="sales/mail" element={<SalesMail />} />
              <Route path="sales/completed" element={<CompletedDeals />} />
              <Route path="sales/deleted" element={<DeletedDeals />} />
              <Route path="sales/deals/:id" element={<DealDetail />} />
              <Route path="sales-team" element={<SalesTeam />} />
              <Route path="sales-team/details" element={<SalesPersonDetails />} />
              <Route path="marketing-team" element={<MarketingTeam />} />
              <Route path="growth-team" element={<GrowthTeam />} />
              <Route path="operations-team" element={<OperationsTeam />} />
              <Route path="tech-team" element={<TechTeam />} />
              <Route path="hr-team" element={<HRTeam />} />
              <Route path="team/:id" element={<TeamMemberDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="company-assets" element={<CompanyAssets />} />
              <Route path="marketing-team/activities" element={<ActivitiesPage />} />
              <Route path="marketing-team/sequences" element={<EmailSequences />} />
              <Route path="marketing-team/sequences/new" element={<CreateSequence />} />
              <Route path="marketing-team/sequences/:id" element={<SequenceBuilder />} />
              <Route path="sales/activities" element={<SalesMarketingActivities />} />
              <Route path="sales-dashboard/sequences" element={<EmailSequences />} />
              <Route path="sales-dashboard/sequences/new" element={<CreateSequence />} />
              <Route path="sales-dashboard/sequences/:id" element={<SequenceBuilder />} />
              <Route path="finance" element={<FinanceHub />} />
              <Route path="finance/payslip-generator" element={<PayslipGenerator />} />
              <Route path="finance/invoice-generator" element={<InvoiceLayout />}>
                <Route index element={<InvoiceForm />} />
                <Route path="dashboard" element={<InvoiceDashboard />} />
                <Route path="list" element={<Invoices />} />
                <Route path="list/:id" element={<InvoiceView />} />
                <Route path="list/:id/edit" element={<InvoiceForm />} />
                <Route path="customers" element={<InvoiceCustomers />} />
                <Route path="payments" element={<InvoicePayments />} />
                <Route path="catalog" element={<InvoiceProducts />} />
                <Route path="settings" element={<InvoiceSettings />} />
              </Route>
            </Route>
            <Route path="/invoice/:id/public" element={<PublicInvoice />} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
export default App
