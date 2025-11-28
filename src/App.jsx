import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import MarketingTeam from './pages/Teams/MarketingTeam'
import GrowthTeam from './pages/Teams/GrowthTeam'
import OperationsTeam from './pages/Teams/OperationsTeam'
import TechTeam from './pages/Teams/TechTeam'
import HRTeam from './pages/Teams/HRTeam'
import { ToastProvider } from './components/ToastProvider'
import TeamMemberDetail from './components/TeamMemberDetail'

function App() {
  return (
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
            <Route path="marketing-team" element={<MarketingTeam />} />
            <Route path="growth-team" element={<GrowthTeam />} />
            <Route path="operations-team" element={<OperationsTeam />} />
            <Route path="tech-team" element={<TechTeam />} />
            <Route path="hr-team" element={<HRTeam />} />
            <Route path="team/:id" element={<TeamMemberDetail />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
// /
export default App
