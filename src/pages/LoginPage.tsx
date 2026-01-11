import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import useEntries from "../hooks/useEntries";
import useInsights from "../hooks/useInsights";

const providerButtons = [
  { id: "google", label: "Continue with Google" as const },
  { id: "apple", label: "Sign in with Apple" as const },
  { id: "email", label: "Use email + magic link" as const },
];

const trackingChecklist = [
  "Save daily entries with mood, triggers, and coping notes.",
  "Auto-build therapy-ready briefs you can export or share.",
  "Spot trends across sleep, work, and relationships faster.",
];

const LoginPage = () => {
  const { signInWithOtp, signInWithProvider, status, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("email");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (status === "authed") {
      const from = (location.state as { from?: string } | undefined)?.from ?? "/journal";
      navigate(from, { replace: true });
    }
  }, [location.state, navigate, status]);

  const friendlyName = useMemo(() => {
    if (!email) return "you";
    const name = email.split("@")[0];
    if (!name) return "you";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [email]);

  const { data: entries, loading: entriesLoading, error: entriesError, empty: entriesEmpty } = useEntries({
    limit: 10,
  });
  const {
    data: insights,
    loading: insightsLoading,
    error: insightsError,
    empty: insightsEmpty,
  } = useInsights({ limit: 4 });

  const entryPreview = entries[0];
  const topInsights = insights.slice(0, 2);

  const uniqueTags = useMemo(() => {
    const allTags = entries.flatMap((entry) => entry.tags || []);
    return new Set(allTags).size;
  }, [entries]);

  const metrics = [
    {
      label: "Entries logged",
      value: entries.length ? `${entries.length} this month` : "0 logged",
      helper: entries.length ? "Latest entry ready to brief." : "Log your first reflection to unlock insights.",
    },
    {
      label: "Trigger clarity",
      value: uniqueTags ? `${uniqueTags} tags` : "No tags yet",
      helper: uniqueTags ? "We track spikes by your tags." : "Tag triggers to see correlations.",
    },
    {
      label: "Insights",
      value: insights.length ? `${insights.length} surfaced` : "None yet",
      helper: insights.length
        ? `Newest: ${insights[0]?.title ?? ""}`.trim()
        : "Insights appear after a few entries.",
    },
  ];

  const handleEmailLogin = async () => {
    setActionError(null);
    setActionMessage(null);

    if (!email) {
      setActionError("Enter an email to get your magic link.");
      return;
    }

    try {
      setPendingAction("email");
      await signInWithOtp(email);
      setActionMessage("Check your email for a secure magic link. Once you click it, we’ll redirect you here.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send magic link right now.";
      setActionError(message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleProviderLogin = async (provider: "google" | "apple") => {
    setSelectedProvider(provider);
    setActionError(null);
    setActionMessage(null);
    try {
      setPendingAction(provider);
      setActionMessage("Redirecting to continue signing in...");
      await signInWithProvider(provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start login with that provider.";
      setActionError(message);
      setActionMessage(null);
      setPendingAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-white to-brand/5 text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-brandLight">Log in</p>
            <h1 className="text-4xl font-semibold leading-tight text-brand md:text-5xl">
              Sign in to start your free journal.
            </h1>
            <p className="text-lg text-brand/80">
              Choose how you want to log in. Once inside, we&apos;ll start tracking patterns tailored to {friendlyName}.
            </p>
            {!isConfigured && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable
                login and live data.
              </div>
            )}
            <div className="space-y-3 rounded-3xl border border-brand/10 bg-white/80 p-5 shadow-sm">
              {trackingChecklist.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />
                  <p className="text-sm text-slate-600">{item}</p>
                </div>
              ))}
            </div>
            <Card className="border-brand/15 bg-white/90 shadow-glow">
              <CardHeader>
                <p className="text-sm uppercase tracking-[0.3em] text-brandLight">Your tracking preview</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  What we&apos;ll surface for {friendlyName}
                </h3>
                <p className="text-sm text-slate-500">
                  Based on your real entries and insights. This updates as you log more.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {entriesLoading ? (
                  <div className="animate-pulse space-y-3 rounded-2xl border border-brand/10 bg-white p-4 shadow-inner">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-4 w-3/4 rounded-full bg-slate-100" />
                    <div className="h-12 rounded-2xl bg-slate-100" />
                  </div>
                ) : entryPreview ? (
                  <div className="rounded-2xl border border-brand/10 bg-white p-4 shadow-inner">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-brand/60">{entryPreview.date}</p>
                        <p className="text-sm font-semibold text-slate-900">{entryPreview.title}</p>
                      </div>
                      <Badge tone="neutral" className="bg-brand/10 text-brand">
                        Entry signal
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{entryPreview.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entryPreview.tags?.length ? (
                        entryPreview.tags.map((tag) => (
                          <Badge key={tag} className="bg-slate-100 text-brand">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">Tag triggers to see patterns here.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm font-semibold text-slate-800">No entries yet</p>
                    <p className="text-sm text-slate-500">
                      Log your first reflection after signing in to see personalized signals here.
                    </p>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  {metrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-brand/70">{metric.label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">{metric.value}</p>
                      <p className="text-xs text-slate-500">{metric.helper}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-brand/60">Insights queued</p>
                  {insightsLoading ? (
                    <div className="mt-2 space-y-2">
                      <div className="h-3 rounded-full bg-brand/10" />
                      <div className="h-3 rounded-full bg-brand/10" />
                    </div>
                  ) : insightsError ? (
                    <p className="text-sm text-rose-600">Couldn&apos;t load insights: {insightsError}</p>
                  ) : insightsEmpty ? (
                    <p className="text-sm text-slate-600">We&apos;ll surface insights after a few entries.</p>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {topInsights.map((insight) => (
                        <p key={insight.id} className="text-sm text-slate-700">
                          • {insight.title}: {insight.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {entriesError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    Couldn&apos;t load entries: {entriesError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="border-brand/20 bg-white/95 shadow-lg shadow-brand/10">
            <CardHeader className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-brandLight">Sign in</p>
              <h2 className="text-2xl font-semibold text-slate-900">Choose how to log in</h2>
              <p className="text-sm text-slate-600">
                Pick a provider and we&apos;ll sync your tracking to your account. No credit card required.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3">
                {providerButtons.map((provider) => (
                  <Button
                    key={provider.id}
                    type="button"
                    variant={selectedProvider === provider.id ? "primary" : "secondary"}
                    className="w-full justify-center"
                    onClick={() => {
                      if (provider.id === "email") {
                        setSelectedProvider("email");
                        return;
                      }
                      handleProviderLogin(provider.id);
                    }}
                    disabled={pendingAction !== null && pendingAction !== provider.id}
                  >
                    {pendingAction === provider.id ? "Redirecting..." : provider.label}
                  </Button>
                ))}
              </div>
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">
                  Email for your magic link
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleEmailLogin}
                  disabled={pendingAction !== null && pendingAction !== "email"}
                >
                  {pendingAction === "email" ? "Sending..." : "Send login link"}
                </Button>
                <p className="text-xs text-slate-500">
                  We&apos;ll email a secure link. If you prefer a password, choose Apple or Google above.
                </p>
              </div>
              {actionMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {actionMessage}
                </div>
              )}
              {actionError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {actionError}
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-brand/5 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Start tracking as {friendlyName}</p>
                    <p className="text-sm text-slate-600">
                      We&apos;ll keep your mood streak, triggers, and therapy briefs tied to this login.
                    </p>
                  </div>
                </div>
                {status === "authed" ? (
                  <Link to="/journal" className="w-full">
                    <Button className="w-full">Enter my workspace</Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled>
                    Log in to continue
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                By continuing you agree to mindful, private tracking. You can delete your data anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
