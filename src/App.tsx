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
          <Route path="/home" element={<HomeDashboardPage />} />
          <Route path="/dashboard" element={<HomeDashboardPage />} />
          <Route path="/journal" element={<JournalDashboard />} />
          <Route path="/entry" element={<EntryEditorPage />} />
          <Route path="/entry/:id" element={<EntryDetailPage />} />
          <Route path="/entry/:id/edit" element={<EntryEditPage />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/prepare" element={<PreparePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/cycles" element={<CyclesGraphPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
