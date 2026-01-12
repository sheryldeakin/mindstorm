import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import EntryEditorPage from "./pages/EntryEditorPage";
import EntryDetailPage from "./pages/EntryDetailPage";
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
    <div className="min-h-screen bg-white text-slate-900">
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
          <Route path="/journal" element={<JournalDashboard />} />
          <Route path="/entry" element={<EntryEditorPage />} />
          <Route path="/entry/:id" element={<EntryDetailPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/cycles" element={<CyclesGraphPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
