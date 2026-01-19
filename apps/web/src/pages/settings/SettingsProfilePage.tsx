import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Textarea from "../../components/ui/Textarea";
import Button from "../../components/ui/Button";
import SettingsSaveBar from "../../components/features/SettingsSaveBar";
import useSettings from "../../hooks/useSettings";
import { getApiUrl, getToken } from "../../lib/apiClient";
import PageHeader from "../../components/layout/PageHeader";

const SettingsProfilePage = () => {
  const { data, loading, saving, error, updateSettings, refresh } = useSettings();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.profile.displayName || "");
    setUsername(data.profile.username || "");
    setBio(data.profile.bio || "");
    setGender(data.profile.gender || "");
    setBirthdate(data.profile.birthdate || "");
  }, [data]);

  const isDirty = useMemo(() => {
    return (
      displayName !== (data.profile.displayName || "") ||
      username !== (data.profile.username || "") ||
      bio !== (data.profile.bio || "") ||
      gender !== (data.profile.gender || "") ||
      birthdate !== (data.profile.birthdate || "")
    );
  }, [bio, birthdate, data.profile, displayName, gender, username]);

  const handleDiscard = () => {
    setDisplayName(data.profile.displayName || "");
    setUsername(data.profile.username || "");
    setBio(data.profile.bio || "");
    setGender(data.profile.gender || "");
    setBirthdate(data.profile.birthdate || "");
  };

  const handleSave = async () => {
    await updateSettings({
      profile: {
        displayName,
        username,
        bio,
        gender,
        birthdate,
      },
    });
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const token = getToken();
      const response = await fetch(`${getApiUrl()}/patient/settings/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Upload failed.");
      }
      await response.json();
      refresh();
      setAvatarSuccess("Avatar updated.");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const token = getToken();
      const response = await fetch(`${getApiUrl()}/patient/settings/avatar`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Remove failed.");
      }
      await response.json();
      refresh();
      setAvatarSuccess("Avatar removed.");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader pageId="settings-profile" />
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {data.profile.avatarUrl ? (
              <img
                src={`${getApiUrl()}${data.profile.avatarUrl}`}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-xl font-semibold text-brand">
                {(displayName || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-700">Profile photo</p>
              <p className="text-sm text-slate-500">Upload a square image for your avatar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleAvatarUpload(file);
                }
                event.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUploading ? "Uploading..." : "Upload"}
            </Button>
            <Button
              variant="ghost"
              disabled={avatarUploading || !data.profile.avatarUrl}
              onClick={handleAvatarRemove}
            >
              Remove
            </Button>
          </div>
        </div>
        {avatarError ? <p className="mt-3 text-sm text-rose-600">{avatarError}</p> : null}
        {avatarSuccess ? <p className="mt-3 text-sm text-emerald-600">{avatarSuccess}</p> : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Display name</p>
            <Input
              className="mt-2"
              value={displayName}
              disabled={loading}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Username</p>
            <Input
              className="mt-2"
              value={username}
              disabled={loading}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Gender</p>
            <select
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100"
              value={gender}
              disabled={loading}
              onChange={(event) => setGender(event.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Birthday</p>
            <Input
              className="mt-2"
              type="date"
              value={birthdate}
              disabled={loading}
              onChange={(event) => setBirthdate(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Short bio</p>
            <Textarea
              className="mt-2"
              rows={3}
              value={bio}
              disabled={loading}
              onChange={(event) => setBio(event.target.value)}
              placeholder="A short note about you."
            />
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

export default SettingsProfilePage;
