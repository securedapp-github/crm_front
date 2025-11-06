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
import Tickets from './pages/Service/Tickets'
import Notes from './pages/Collaboration/Notes'
import { ToastProvider } from './components/ToastProvider'

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
            <Route path="sales/deals/:id" element={<DealDetail />} />
            <Route path="service" element={<Tickets />} />
            <Route path="collaboration" element={<Notes />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
// /
export default App
