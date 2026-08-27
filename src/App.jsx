import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import CitizenLayout from './components/layout/CitizenLayout';
import AdminLayout from './components/layout/AdminLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ReportIssue from './pages/citizen/ReportIssue';
import MyIssues from './pages/citizen/MyIssues';
import IssueDetails from './pages/citizen/IssueDetails';
import CivicMap from './pages/citizen/CivicMap';
import CitizenProfile from './pages/citizen/CitizenProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AllIssues from './pages/admin/AllIssues';
import PriorityQueue from './pages/authority/PriorityQueue';
import AuthorityIssueDetails from './pages/authority/AuthorityIssueDetails';
import AuthorityMap from './pages/authority/AuthorityMap';
import Workers from './pages/department/Workers';
import Departments from './pages/admin/Departments';
import Escalations from './pages/authority/Escalations';
import CivicMemory from './pages/authority/CivicMemory';
import ResolutionPerformance from './pages/admin/ResolutionPerformance';
import AdminIntegrity from './pages/admin/AdminIntegrity';
import CivicCopilot from './pages/authority/CivicCopilot';
import AuditLogs from './pages/admin/AuditLogs';

import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerTasks from './pages/worker/WorkerTasks';
import WorkerTaskDetails from './pages/worker/WorkerTaskDetails';
import WorkerMap from './pages/worker/WorkerMap';
import WorkerHistory from './pages/worker/WorkerHistory';
import WorkerProfile from './pages/worker/WorkerProfile';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Citizen Routes */}
        <Route element={<ProtectedRoute allowedRoles={['citizen', 'admin', 'worker']} />}>
          <Route path="/citizen" element={<CitizenLayout />}>
            <Route index element={<CitizenDashboard />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="issues" element={<MyIssues />} />
            <Route path="issues/:id" element={<IssueDetails />} />
            <Route path="map" element={<CivicMap />} />
            <Route path="profile" element={<CitizenProfile />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="issues" element={<AllIssues />} />
            <Route path="issues/:id" element={<AuthorityIssueDetails />} />
            <Route path="priority" element={<PriorityQueue />} />
            <Route path="map" element={<AuthorityMap />} />
            <Route path="workers" element={<Workers />} />
            <Route path="departments" element={<Departments />} />
            <Route path="escalations" element={<Escalations />} />
            <Route path="civic-memory" element={<CivicMemory />} />
            <Route path="resolution-performance" element={<ResolutionPerformance />} />
            <Route path="integrity" element={<AdminIntegrity />} />
            <Route path="copilot" element={<CivicCopilot />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>

        {/* Worker Routes */}
        <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route index element={<Navigate to="/worker/dashboard" replace />} />
            <Route path="dashboard" element={<WorkerDashboard />} />
            <Route path="tasks" element={<WorkerTasks />} />
            <Route path="tasks/:id" element={<WorkerTaskDetails />} />
            <Route path="map" element={<WorkerMap />} />
            <Route path="history" element={<WorkerHistory />} />
            <Route path="profile" element={<WorkerProfile />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
