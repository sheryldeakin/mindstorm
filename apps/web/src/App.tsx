import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import EntryEditorPage from "./pages/EntryEditorPage";
import EntryDetailPage from "./pages/EntryDetailPage";
import EntryEditPage from "./pages/EntryEditPage";
import CheckInPage from "./pages/CheckInPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import PreparePage from "./pages/PreparePage";
import SettingsPage from "./pages/SettingsPage";
import HomeDashboardPage from "./pages/HomeDashboardPage";
import HomePage from "./pages/HomePage";
import JournalDashboard from "./pages/JournalDashboard";
import PatternsPage from "./pages/PatternsPage";
import CyclesGraphPage from "./pages/CyclesGraphPage";
import LoginPage from "./pages/LoginPage";
import PortalPage from "./pages/PortalPage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import ClinicianCriteriaPage from "./pages/ClinicianCriteriaPage";
import ClinicianDifferentialPage from "./pages/ClinicianDifferentialPage";
import ClinicianShell from "./components/layout/ClinicianShell";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <div className="ms-bg min-h-screen text-slate-900">
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar variant="landing" />
              <HomePage />
              <Footer />
            </>
          }
        />
        <Route
          path="/login"
          element={
            <>
              <Navbar variant="landing" />
              <LoginPage />
              <Footer />
            </>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/patient">
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<HomeDashboardPage />} />
            <Route path="dashboard" element={<HomeDashboardPage />} />
            <Route path="journal" element={<JournalDashboard />} />
            <Route path="entry" element={<EntryEditorPage />} />
            <Route path="entry/:id" element={<EntryDetailPage />} />
            <Route path="entry/:id/edit" element={<EntryEditPage />} />
            <Route path="check-in" element={<CheckInPage />} />
            <Route path="connections" element={<ConnectionsPage />} />
            <Route path="prepare" element={<PreparePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="patterns" element={<PatternsPage />} />
            <Route path="cycles" element={<CyclesGraphPage />} />
          </Route>
        </Route>
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinician"
          element={
            <ProtectedRoute>
              <ClinicianShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClinicianDashboardPage />} />
          <Route path="criteria" element={<ClinicianCriteriaPage />} />
          <Route path="differential" element={<ClinicianDifferentialPage />} />
        </Route>
        <Route path="/home" element={<Navigate to="/patient/home" replace />} />
        <Route path="/dashboard" element={<Navigate to="/patient/home" replace />} />
        <Route path="/journal" element={<Navigate to="/patient/journal" replace />} />
        <Route path="/entry" element={<Navigate to="/patient/entry" replace />} />
        <Route path="/entry/:id" element={<Navigate to="/patient/entry/:id" replace />} />
        <Route path="/entry/:id/edit" element={<Navigate to="/patient/entry/:id/edit" replace />} />
        <Route path="/check-in" element={<Navigate to="/patient/check-in" replace />} />
        <Route path="/connections" element={<Navigate to="/patient/connections" replace />} />
        <Route path="/prepare" element={<Navigate to="/patient/prepare" replace />} />
        <Route path="/settings" element={<Navigate to="/patient/settings" replace />} />
        <Route path="/patterns" element={<Navigate to="/patient/patterns" replace />} />
        <Route path="/cycles" element={<Navigate to="/patient/cycles" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
