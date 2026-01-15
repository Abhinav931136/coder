import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrophyIcon,
  CodeIcon,
  ZapIcon,
  CalendarIcon,
  TrendingUpIcon,
  StarIcon,
  ClockIcon,
  UsersIcon,
  TargetIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

const Dashboard = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      try {
        const profileResp = await apiFetch("/api/auth/profile", {
          timeout: 10000,
        }).catch((e) => {
          console.error("Profile fetch failed:", e);
          return null;
        });

        if (profileResp) {
          const d = await profileResp.json().catch(() => null);
          if (profileResp.ok && d?.success && d?.data?.user) {
            setProfile(d.data);
            try {
              localStorage.setItem("user", JSON.stringify(d.data.user));
            } catch {}
          }
        }

        // fetch rank (best-effort)
        try {
          const rankResp = await apiFetch("/api/auth/rank", { timeout: 6000 });
          const rd = await rankResp.json().catch(() => null);
          if (rankResp.ok && rd?.success && typeof rd.data?.rank === "number")
            setRank(rd.data.rank);
        } catch (e) {
          console.error("Rank fetch failed:", e);
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    const intervalId = setInterval(() => {
      // periodic refresh to keep streaks and stats up-to-date
      loadProfile();
    }, 60 * 1000); // every 60 seconds

    const onUpdate = () => {
      // reload from localStorage first for speed
      try {
        const me = JSON.parse(localStorage.getItem("user") || "null");
        if (me) {
          setProfile({ user: me, stats: profile?.stats || {} });
        }
      } catch {}
      // and then refresh from server
      loadProfile();
    };

    window.addEventListener("user:update", onUpdate);
    return () => {
      window.removeEventListener("user:update", onUpdate);
      clearInterval(intervalId);
    };
  }, []);

  const user =
    profile?.user || JSON.parse(localStorage.getItem("user") || "null");

  const userStats = {
    name: user
      ? user.first_name
        ? `${user.first_name} ${user.last_name || ""}`.trim()
        : user.username
      : "",
    username: user?.username || "",
    rank: rank ?? 0,
    totalPoints: user?.points || 0,
    streak: user?.streak_days || 0,
    challengesSolved: profile?.stats?.challenges_solved || 0,
    battlesWon: profile?.stats?.battles_won || 0,
    hackathonsJoined: profile?.stats?.hackathons_participated || 0,
  };

  const recentChallenges = (profile?.stats?.recent_submissions || []).map(
    (s: any) => ({
      id: s._id || `${s.challenge_id || s.battle_id}-${s.submitted_at}`,
      title: s.battle_title
        ? `${s.battle_title} — ${s.battle_challenge_title || s.challenge_title || ""}`
        : s.challenge_title || s.challenge_id || s.battle_id,
      difficulty: s.difficulty || (s.status === "accepted" ? "Easy" : "—"),
      solved: s.status === "accepted",
      points: s.score || 0,
    }),
  );

  // Selected submission details (when user clicks a recent item)
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetchSubmission = async (id: string) => {
    try {
      const resp = await apiFetch(`/api/submissions/${encodeURIComponent(id)}`);
      const j = await resp.json().catch(() => null);
      if (resp.ok && j?.success && j.data?.submission) {
        setSelectedSubmission(j.data.submission);
      } else {
        setSelectedSubmission(null);
      }
    } catch (e) {
      console.error("Failed to fetch submission", e);
      setSelectedSubmission(null);
    }
  };

  // Contribution calendar: transform recent_submissions into counts per day
  const contributionData = useMemo(() => {
    const subs = profile?.stats?.recent_submissions || [];
    const counts: Record<string, any[]> = {};
    for (const s of subs) {
      const d = s.submitted_at ? new Date(s.submitted_at) : new Date();
      const key = d.toISOString().slice(0, 10);
      if (!counts[key]) counts[key] = [];
      counts[key].push(s);
    }

    // build last 91 days grid (13 weeks x 7 days)
    const days = 91;
    const arr: { date: string; count: number; subs: any[] }[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      arr.push({ date: key, count: counts[key] ? counts[key].length : 0, subs: counts[key] || [] });
    }

    // group into weeks (starting Sunday)
    const weeks: Array<Array<{ date: string; count: number; subs: any[] }>> = [];
    let week: any[] = [];
    for (let i = 0; i < arr.length; i++) {
      const dt = new Date(arr[i].date + "T00:00:00Z");
      const day = dt.getUTCDay(); // 0 (Sun) - 6 (Sat)
      week.push(arr[i]);
      if (day === 6) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length) weeks.push(week);

    return { weeks, flat: arr };
  }, [profile?.stats?.recent_submissions]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selectedDaySubs = useMemo(() => {
    if (!selectedDay) return [];
    return contributionData.flat.filter((d) => d.date === selectedDay)[0]?.subs || [];
  }, [selectedDay, contributionData]);

  const upcomingEvents = [
    {
      id: 1,
      title: "Spring Hackathon 2024",
      date: "Mar 15-17",
      type: "Hackathon",
    },
    { id: 2, title: "Weekly Coding Battle", date: "Mar 10", type: "Battle" },
    { id: 3, title: "Algorithm Workshop", date: "Mar 12", type: "Workshop" },
  ];

  const achievements = [
    {
      title: "Problem Solver",
      description: "Solved 100+ challenges",
      icon: TargetIcon,
    },
    { title: "Speed Demon", description: "Won 20+ battles", icon: ZapIcon },
    {
      title: "Team Player",
      description: "Participated in 5+ hackathons",
      icon: UsersIcon,
    },
  ];

  const skillProgress = [
    { skill: "Algorithms", progress: 85 },
    { skill: "Data Structures", progress: 78 },
    { skill: "System Design", progress: 62 },
    { skill: "Database", progress: 71 },
  ];

  return (
    <Layout>
      <div className="container py-8">
        {loading && (
          <p className="text-muted-foreground mb-4">
            Loading your dashboard...
          </p>
        )}
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={user?.profile_image || "/placeholder-avatar.jpg"}
              />
              <AvatarFallback className="bg-brand-100 text-brand-700 text-lg font-semibold">
                {(() => {
                  const full = user
                    ? user.first_name
                      ? `${user.first_name} ${user.last_name || ""}`.trim()
                      : user.username
                    : "";
                  if (!full) return "?";
                  return full
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                })()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{userStats.name}</h1>
              <p className="text-muted-foreground">@{userStats.username}</p>
              <div className="flex items-center mt-1">
                <TrophyIcon className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">
                  Rank #{userStats.rank}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <Link to="/challenges">
                <CodeIcon className="mr-2 h-4 w-4" />
                Solve Challenge
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/battles">
                <ZapIcon className="mr-2 h-4 w-4" />
                Start Battle
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Points
              </CardTitle>
              <StarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.totalPoints.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="inline h-3 w-3 mr-1" />
                +180 this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Streak
              </CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.streak} days</div>
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Challenges Solved
              </CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userStats.challengesSolved}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="inline h-3 w-3 mr-1" />
                +3 this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Battles Won</CardTitle>
              <ZapIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.battlesWon}</div>
              <p className="text-xs text-muted-foreground">78% win rate</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Challenges */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Challenges</CardTitle>
                  <CardDescription>
                    Your latest problem-solving activity
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/challenges">
                    View All
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(profile?.stats?.recent_submissions || []).map((s: any, idx: number) => {
                    const solved = s.status === "accepted";
                    const points = s.score || 0;
                    return (
                      <div
                        key={s._id || `${s.challenge_id || s.battle_id}-${s.submitted_at || idx}`}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                        onClick={() => {
                          if (s.challenge_id) return navigate(`/challenge/${s.challenge_id}`);
                          if (s.battle_id) return navigate(`/battle/${s.battle_id}`);
                          if (s._id) return fetchSubmission(String(s._id));
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${solved ? "bg-green-500" : "bg-orange-500"}`} />
                          <div>
                            <p className="font-medium">{s.challenge_title || s.battle_challenge_title || s.challenge_id || s.battle_id}</p>
                            <div className="text-sm text-muted-foreground">
                              <Badge className="text-xs">{s.language || (s.status === "accepted" ? "Accepted" : s.status)}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{points} pts</p>
                          {solved && <CheckCircleIcon className="h-4 w-4 text-green-500 ml-auto" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Submission Details */}
            {selectedSubmission && (
              <Card>
                <CardHeader>
                  <CardTitle>Submission Details</CardTitle>
                  <CardDescription>
                    Details for submission {selectedSubmission._id || selectedSubmission.submission_id}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{selectedSubmission.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="font-medium">{selectedSubmission.score ?? selectedSubmission.points ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="font-medium">{selectedSubmission.submitted_at ? new Date(selectedSubmission.submitted_at).toLocaleString() : "-"}</p>
                      </div>
                    </div>

                    {selectedSubmission.language && (
                      <div>
                        <p className="text-sm text-muted-foreground">Language</p>
                        <p className="font-medium">{selectedSubmission.language}</p>
                      </div>
                    )}

                    {selectedSubmission.code && (
                      <div>
                        <p className="text-sm text-muted-foreground">Code</p>
                        <pre className="text-sm bg-slate-100 dark:bg-zinc-900 p-3 rounded overflow-auto">
{selectedSubmission.code.substring ? selectedSubmission.code.substring(0, 2000) : String(selectedSubmission.code)}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button variant="ghost" onClick={() => setSelectedSubmission(null)}>Close</Button>
                      {selectedSubmission.challenge_id && (
                        <Button asChild>
                          <Link to={`/challenge/${selectedSubmission.challenge_id}`}>
                            View Challenge
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skill Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Skill Progress</CardTitle>
                <CardDescription>
                  Track your improvement across different areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skillProgress.map((skill) => (
                    <div key={skill.skill}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">
                          {skill.skill}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {skill.progress}%
                        </span>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contribution Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Activity (Last 91 days)</CardTitle>
                <CardDescription>Visual representation of your submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex items-start space-x-1 py-2">
                    {contributionData.weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col space-y-1">
                        {Array.from({ length: 7 }).map((_, di) => {
                          const day = week[di] || { date: null, count: 0, subs: [] };
                          const count = day.count || 0;
                          const color = count === 0 ? "bg-muted" : count <= 1 ? "bg-green-200" : count <= 3 ? "bg-green-400" : "bg-green-600";
                          return (
                            <button
                              key={di}
                              onClick={() => day.date && setSelectedDay(day.date)}
                              title={`${day.date || ""}: ${count} submissions`}
                              className={`w-4 h-4 rounded ${color} border border-transparent hover:border-slate-300`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-muted inline-block rounded" />
                    <span>0</span>
                    <span className="w-4 h-4 bg-green-200 inline-block rounded ml-4" />
                    <span>1</span>
                    <span className="w-4 h-4 bg-green-400 inline-block rounded ml-4" />
                    <span>2-3</span>
                    <span className="w-4 h-4 bg-green-600 inline-block rounded ml-4" />
                    <span>4+</span>
                  </div>
                </div>

                {selectedDay && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">Submissions on {selectedDay}</p>
                    <div className="space-y-2 mt-2">
                      {selectedDaySubs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No submissions</p>
                      ) : (
                        selectedDaySubs.map((s: any, i: number) => (
                          <div key={i} className="p-2 border rounded bg-muted/30">
                            <div className="flex justify-between">
                              <div className="text-sm font-medium">{s.challenge_title || s.battle_challenge_title || s.challenge_id || s.battle_id}</div>
                              <div className="text-xs text-muted-foreground">{s.status}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>
                  Don't miss these opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.date}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline" asChild>
                  <Link to="/hackathons">View All Events</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                        <achievement.icon className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  View All Achievements
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
