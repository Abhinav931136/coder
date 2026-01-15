import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch } from "@/lib/api";
import { AlertTriangleIcon, CheckIcon } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  email_verified: boolean;
  institution_id?: number | null;
  institution_name?: string | null;
  profile_image?: string;
  bio?: string;
  github_username?: string;
  linkedin_url?: string;
  points?: number;
  streak_days?: number;
  created_at?: string;
}

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const s = localStorage.getItem("user");
      return s ? (JSON.parse(s) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewUsername = params.get("username") || params.get("user") || null;
    const token = localStorage.getItem("token");

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (viewUsername) {
          const resp = await apiFetch(
            `/api/auth/user?username=${encodeURIComponent(viewUsername)}`,
          );
          const d = await resp.json().catch(() => null);
          if (resp.ok && d?.success && d?.data?.user) {
            setUser(d.data.user as UserProfile);
            try {
              (window as any).__lastProfile = d.data;
            } catch {}
            const me = JSON.parse(localStorage.getItem("user") || "null");
            setIsOwn(!!(me && me.username === d.data.user.username));
            return;
          }
        } else {
          const stored = localStorage.getItem("user");
          if (!token) {
            // If we have a cached user in localStorage, show it instead of forcing sign-in
            if (stored) {
              try {
                const parsed = JSON.parse(stored) as UserProfile;
                setUser(parsed);
                try {
                  (window as any).__lastProfile = {
                    user: parsed,
                    stats: { recent_submissions: [] },
                  };
                } catch {}
                setIsOwn(true);
              } catch {}
            }
            setLoading(false);
            return;
          }

          const resp = await apiFetch("/api/auth/profile");
          const d = await resp.json().catch(() => null);
          if (resp.ok && d?.success && d?.data?.user) {
            setUser(d.data.user as UserProfile);
            try {
              (window as any).__lastProfile = d.data;
            } catch {}
            setIsOwn(true);
            return;
          }
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const onUpdate = () => {
      if (!viewUsername) {
        const me = JSON.parse(localStorage.getItem("user") || "null");
        if (me) setUser(me as UserProfile);
      }
    };

    window.addEventListener("user:update", onUpdate);
    return () => window.removeEventListener("user:update", onUpdate);
  }, [location.search, location.pathname]);

  const fullName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username
    : "";

  const [editing, setEditing] = useState(false);
  const [isOwn, setIsOwn] = useState(true);
  const [draft, setDraft] = useState<any>({});

  useEffect(() => {
    if (user)
      setDraft({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        bio: user.bio || "",
        github_username: user.github_username || "",
        linkedin_url: user.linkedin_url || "",
        profile_image: user.profile_image || "",
      });
  }, [user]);

  const handleResend = async () => {
    setResendErr(null);
    setResendMsg(null);
    setDebugLink(null);
    setResendLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setResendErr("Please sign in first");
        return;
      }
      const resp = await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success) {
        setResendErr(data?.message || "Unable to send verification email");
        return;
      }
      setResendMsg(data.message || "Verification email sent");
      if (data.link) setDebugLink(data.link as string);
    } catch (e) {
      setResendErr("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isOwn ? "Your Profile" : `${fullName} Profile`}
            </CardTitle>
            <CardDescription>
              {isOwn ? "Manage your account information" : fullName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !user ? (
              <p className="text-muted-foreground">
                Please sign in to view your profile.
              </p>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-1 flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.profile_image || ""} />
                    <AvatarFallback>
                      {fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold">{fullName}</h2>
                    <p className="text-sm text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>

                  <div className="w-full flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <Badge
                        variant={user.email_verified ? "default" : "secondary"}
                      >
                        {user.email_verified
                          ? "Email Verified"
                          : "Email Not Verified"}
                      </Badge>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>

                    {editing ? (
                      <div className="w-full mt-4 space-y-2">
                        <div>
                          <label className="block text-sm font-medium">
                            First name
                          </label>
                          <input
                            className="mt-1 block w-full border rounded px-2 py-1"
                            value={draft.first_name}
                            onChange={(e) =>
                              setDraft({ ...draft, first_name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            Last name
                          </label>
                          <input
                            className="mt-1 block w-full border rounded px-2 py-1"
                            value={draft.last_name}
                            onChange={(e) =>
                              setDraft({ ...draft, last_name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            Bio
                          </label>
                          <textarea
                            className="mt-1 block w-full border rounded px-2 py-1"
                            value={draft.bio}
                            onChange={(e) =>
                              setDraft({ ...draft, bio: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            GitHub Username
                          </label>
                          <input
                            className="mt-1 block w-full border rounded px-2 py-1"
                            value={draft.github_username}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                github_username: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium">
                            LinkedIn URL
                          </label>
                          <input
                            className="mt-1 block w-full border rounded px-2 py-1"
                            value={draft.linkedin_url}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                linkedin_url: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium">
                            Profile Photo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const reader = new FileReader();
                              reader.onload = () =>
                                setDraft({
                                  ...draft,
                                  profile_image: String(reader.result || ""),
                                });
                              reader.readAsDataURL(f);
                            }}
                          />
                          {draft.profile_image && (
                            <img
                              src={draft.profile_image}
                              alt="preview"
                              className="mt-2 h-20 w-20 rounded-full object-cover"
                            />
                          )}
                        </div>

                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={async () => {
                              const token = localStorage.getItem("token");
                              if (!token) return;
                              try {
                                const resp = await apiFetch(
                                  "/api/auth/profile",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify(draft),
                                  },
                                );
                                const data = await resp
                                  .json()
                                  .catch(() => null);
                                if (
                                  resp.ok &&
                                  data?.success &&
                                  data.data?.user
                                ) {
                                  setUser(data.data.user as UserProfile);
                                  localStorage.setItem(
                                    "user",
                                    JSON.stringify(data.data.user),
                                  );
                                  try {
                                    window.dispatchEvent(
                                      new Event("user:update"),
                                    );
                                  } catch (e) {}
                                  setEditing(false);
                                }
                              } catch (e) {}
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditing(false);
                              setDraft({
                                first_name: user.first_name || "",
                                last_name: user.last_name || "",
                                bio: user.bio || "",
                                github_username: user.github_username || "",
                                linkedin_url: user.linkedin_url || "",
                                profile_image: user.profile_image || "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : isOwn ? (
                      <div className="mt-4">
                        <Button onClick={() => setEditing(true)}>
                          Edit Profile
                        </Button>
                      </div>
                    ) : null}

                    {isOwn && !user.email_verified && (
                      <div className="w-full flex flex-col items-center gap-2 mt-1">
                        <Button
                          size="sm"
                          onClick={handleResend}
                          disabled={resendLoading}
                        >
                          {resendLoading
                            ? "Sending..."
                            : "Resend verification email"}
                        </Button>
                        {resendMsg && (
                          <Alert className="bg-green-50 border-green-200">
                            <CheckIcon className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              {resendMsg}
                            </AlertDescription>
                          </Alert>
                        )}
                        {resendErr && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              {resendErr}
                            </AlertDescription>
                          </Alert>
                        )}
                        {debugLink && (
                          <div className="text-xs text-muted-foreground break-all">
                            Direct link (dev):{" "}
                            <a href={debugLink} className="underline">
                              {debugLink}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Account</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Email: {user.email}</p>
                      {user.institution_name && (
                        <p>Institution: {user.institution_name}</p>
                      )}
                      {user.github_username && (
                        <p>
                          GitHub:{" "}
                          <a
                            href={`https://github.com/${user.github_username}`}
                            className="underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            @{user.github_username}
                          </a>
                        </p>
                      )}
                      {user.linkedin_url && (
                        <p>
                          LinkedIn:{" "}
                          <a
                            href={user.linkedin_url}
                            className="underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {user.linkedin_url}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {user.points ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total Points
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">
                          {user.streak_days ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current Streak
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {user.bio && (
                    <div>
                      <h3 className="font-semibold mb-2">Bio</h3>
                      <p className="text-sm text-muted-foreground">
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Recent Submissions */}
                  <div>
                    <h3 className="font-semibold mb-2">Recent Submissions</h3>
                    <div className="space-y-2">
                      {(() => {
                        const recent: any[] =
                          (window as any).__lastProfile?.stats
                            ?.recent_submissions || [];
                        return recent.map((s: any, idx: number) => (
                          <div
                            key={`${s._id || s.challenge_id}-${idx}`}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {s.battle_title
                                  ? `${s.battle_title} — ${s.battle_challenge_title || s.challenge_title || ""}`
                                  : s.challenge_title || s.challenge_id}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(s.submitted_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={
                                  s.status === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-orange-100 text-orange-800"
                                }
                              >
                                {s.status}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {s.score || 0} pts
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
