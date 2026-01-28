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
import SettingsAccountSecurityPage from "./pages/settings/SettingsAccountSecurityPage";
import SettingsAiInsightsPage from "./pages/settings/SettingsAiInsightsPage";
import SettingsBillingPage from "./pages/settings/SettingsBillingPage";
import SettingsDataActivityPage from "./pages/settings/SettingsDataActivityPage";
import SettingsIntegrationsPage from "./pages/settings/SettingsIntegrationsPage";
import SettingsJournalingDefaultsPage from "./pages/settings/SettingsJournalingDefaultsPage";
import SettingsNotificationsPage from "./pages/settings/SettingsNotificationsPage";
import SettingsPreferencesPage from "./pages/settings/SettingsPreferencesPage";
import SettingsPrivacyPage from "./pages/settings/SettingsPrivacyPage";
import SettingsProfilePage from "./pages/settings/SettingsProfilePage";
import SettingsSharingAccessPage from "./pages/settings/SettingsSharingAccessPage";
import HomeDashboardPage from "./pages/HomeDashboardPage";
import HomePage from "./pages/HomePage";
import JournalDashboard from "./pages/JournalDashboard";
import PatternsPage from "./pages/PatternsPage";
import CyclesGraphPage from "./pages/CyclesGraphPage";
import DemoGraphsPage from "./pages/DemoGraphsPage";
import InteractiveCharacterPage from "./pages/InteractiveCharacterPage";
import LoginPage from "./pages/LoginPage";
import PortalPage from "./pages/PortalPage";
import ClinicianDashboardPage from "./pages/ClinicianDashboardPage";
import ClinicianCriteriaPage from "./pages/ClinicianCriteriaPage";
import ClinicianDifferentialPage from "./pages/ClinicianDifferentialPage";
import ClinicianShell from "./components/layout/ClinicianShell";
import ClinicianCasePage from "./pages/ClinicianCasePage";
import ClinicianSettingsPage from "./pages/ClinicianSettingsPage";
import ClinicianLogicGraphPage from "./pages/ClinicianLogicGraphPage";
import ClinicianDifferentialEvaluationPage from "./pages/ClinicianDifferentialEvaluationPage";

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
            <Route path="settings/profile" element={<SettingsProfilePage />} />
            <Route path="settings/account-security" element={<SettingsAccountSecurityPage />} />
            <Route path="settings/privacy" element={<SettingsPrivacyPage />} />
            <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
            <Route path="settings/preferences" element={<SettingsPreferencesPage />} />
            <Route path="settings/integrations" element={<SettingsIntegrationsPage />} />
            <Route path="settings/billing" element={<SettingsBillingPage />} />
            <Route path="settings/data-activity" element={<SettingsDataActivityPage />} />
            <Route path="settings/journaling-defaults" element={<SettingsJournalingDefaultsPage />} />
            <Route path="settings/sharing-access" element={<SettingsSharingAccessPage />} />
            <Route path="settings/ai-insights" element={<SettingsAiInsightsPage />} />
            <Route path="patterns" element={<PatternsPage />} />
            <Route path="cycles" element={<CyclesGraphPage />} />
            <Route path="demo-graphs" element={<DemoGraphsPage />} />
            <Route path="interactive-character" element={<InteractiveCharacterPage />} />
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
          <Route path="cases/:userId" element={<ClinicianCasePage />} />
          <Route path="criteria" element={<ClinicianCriteriaPage />} />
          <Route path="differential" element={<ClinicianDifferentialPage />} />
          <Route path="logic-graph" element={<ClinicianLogicGraphPage />} />
          <Route path="differential-eval" element={<ClinicianDifferentialEvaluationPage />} />
          <Route path="differential-eval/:caseId" element={<ClinicianDifferentialEvaluationPage />} />
          <Route path="settings" element={<ClinicianSettingsPage />} />
          <Route path="settings/profile" element={<SettingsProfilePage />} />
          <Route path="settings/account-security" element={<SettingsAccountSecurityPage />} />
          <Route path="settings/privacy" element={<SettingsPrivacyPage />} />
          <Route path="settings/notifications" element={<SettingsNotificationsPage />} />
          <Route path="settings/preferences" element={<SettingsPreferencesPage />} />
          <Route path="settings/integrations" element={<SettingsIntegrationsPage />} />
          <Route path="settings/billing" element={<SettingsBillingPage />} />
          <Route path="settings/data-activity" element={<SettingsDataActivityPage />} />
          <Route path="settings/journaling-defaults" element={<SettingsJournalingDefaultsPage />} />
          <Route path="settings/sharing-access" element={<SettingsSharingAccessPage />} />
          <Route path="settings/ai-insights" element={<SettingsAiInsightsPage />} />
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
        <Route path="/demo-graphs" element={<Navigate to="/patient/demo-graphs" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
