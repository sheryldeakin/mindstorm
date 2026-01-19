import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/apiClient";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/layout/PageHeader";

const SettingsAccountSecurityPage = () => {
  const { data, loading, saving, error, updateSettings } = useSettings();
  const { user } = useAuth();
  const [twoFactor, setTwoFactor] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<
    { id: string; userAgent: string; ipAddress: string; lastSeenAt: string; createdAt: string; revokedAt?: string | null }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsActionLoading, setSessionsActionLoading] = useState(false);

  useEffect(() => {
    setTwoFactor(Boolean(data.settings.security?.twoFactorEnabled));
  }, [data.settings.security]);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(null);
    apiFetch<{ sessions: any[]; currentSessionId: string | null }>("/auth/sessions")
      .then((response) => {
        if (cancelled) return;
        setSessions(response.sessions || []);
        setCurrentSessionId(response.currentSessionId || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSessionsError(err instanceof Error ? err.message : "Failed to load sessions.");
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => twoFactor !== Boolean(data.settings.security?.twoFactorEnabled),
    [data.settings.security, twoFactor],
  );

  const handleDiscard = () => {
    setTwoFactor(Boolean(data.settings.security?.twoFactorEnabled));
  };

  const handleSave = async () => {
    await updateSettings({
      security: {
        twoFactorEnabled: twoFactor,
      },
    });
  };

  const handlePasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess("Password updated.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    await apiFetch(`/auth/sessions/${sessionId}/revoke`, { method: "POST" });
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session,
      ),
    );
  };

  const handleRevokeOthers = async () => {
    setSessionsActionLoading(true);
    try {
      await apiFetch("/auth/sessions/revoke-others", { method: "POST" });
      setSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId ? session : { ...session, revokedAt: new Date().toISOString() },
        ),
      );
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Failed to revoke sessions.");
    } finally {
      setSessionsActionLoading(false);
    }
  };

  const formatUserAgent = (userAgent: string) => {
    if (!userAgent) return "Unknown device";
    const ua = userAgent;
    const device = ua.includes("iPhone")
      ? "iPhone"
      : ua.includes("iPad")
        ? "iPad"
        : ua.includes("Android")
          ? "Android"
          : ua.includes("Mac OS X")
            ? "Mac"
            : ua.includes("Windows")
              ? "Windows PC"
              : "Device";

    const browser =
      ua.includes("Edg/") || ua.includes("Edge")
        ? "Edge"
        : ua.includes("Chrome") && !ua.includes("Edg/")
          ? "Chrome"
          : ua.includes("Firefox")
            ? "Firefox"
            : ua.includes("Safari") && !ua.includes("Chrome")
              ? "Safari"
              : "Browser";

    return `${device} · ${browser}`;
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-account-security" />
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</p>
            <Input className="mt-2" value={user?.email || "—"} disabled />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Current password</p>
              <Input
                className="mt-2"
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={loading || passwordSaving}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New password</p>
              <Input
                className="mt-2"
                type="password"
                placeholder="Create a new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={loading || passwordSaving}
              />
            </div>
          </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Two-factor authentication</p>
                <p className="text-sm text-slate-500">Add an extra layer of protection.</p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(event) => setTwoFactor(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  disabled
                />
                <span className="text-slate-400">Coming soon</span>
              </label>
            </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Active sessions</p>
            <p className="text-sm text-slate-500">Devices currently signed in.</p>
            <div className="mt-3 space-y-2">
              {sessionsLoading ? (
                <div className="text-sm text-slate-500">Loading sessions...</div>
              ) : sessionsError ? (
                <div className="text-sm text-rose-600">{sessionsError}</div>
              ) : sessions.length ? (
                sessions.map((session) => {
                  const isCurrent = currentSessionId === session.id;
                  const isRevoked = Boolean(session.revokedAt);
                  const lastSeen = session.lastSeenAt
                    ? new Date(session.lastSeenAt).toLocaleString()
                    : "Unknown";
                  return (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {formatUserAgent(session.userAgent)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {session.ipAddress || "Unknown IP"} · Last seen {lastSeen}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={isCurrent || isRevoked || sessionsActionLoading}
                      >
                        {isCurrent ? "Current session" : isRevoked ? "Revoked" : "Sign out"}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500">No active sessions yet.</div>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevokeOthers}
                disabled={
                  sessionsActionLoading ||
                  !sessions.some((session) => session.id !== currentSessionId && !session.revokedAt)
                }
              >
                {sessionsActionLoading ? "Signing out..." : "Sign out all other sessions"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-xs text-slate-500">
            <div>
              {passwordError ? (
                <span className="text-rose-600">{passwordError}</span>
              ) : passwordSuccess ? (
                <span className="text-emerald-600">{passwordSuccess}</span>
              ) : (
                "Use at least 8 characters."
              )}
            </div>
            <button
              type="button"
              onClick={handlePasswordChange}
              className="rounded-full border border-brand/20 px-3 py-1 text-xs text-brand transition hover:bg-brand/5 disabled:opacity-60"
              disabled={passwordSaving || !currentPassword || newPassword.length < 8}
            >
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      </Card>
      <SettingsSaveBar
        isDirty={isDirty}
        isSaving={saving}
        error={error}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
};

export default SettingsAccountSecurityPage;
