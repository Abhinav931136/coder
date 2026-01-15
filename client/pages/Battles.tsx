import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  SwordsIcon,
  ZapIcon,
  TrophyIcon,
  ClockIcon,
  UsersIcon,
  PlayIcon,
  PlusIcon,
  FilterIcon,
  SearchIcon,
  CrownIcon,
  FlameIcon,
  TargetIcon,
  TimerIcon,
  CodeIcon,
  EyeIcon,
  StarIcon,
} from "lucide-react";
import BattleLeaderboardDialog from "@/components/BattleLeaderboardDialog";

interface Battle {
  id: number;
  title: string;
  challenge_title: string;
  creator: {
    id: number;
    username: string;
    avatar?: string;
    rating: number;
  };
  opponent?: {
    id: number;
    username: string;
    avatar?: string;
    rating: number;
  };
  status: "waiting" | "in_progress" | "completed";
  duration_minutes: number;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  created_at: string;
  started_at?: string;
  prize_points: number;
}

interface BattleResult {
  id: number;
  challenge_title: string;
  opponent_username: string;
  result: "won" | "lost" | "draw";
  your_score: number;
  opponent_score: number;
  duration: number;
  completed_at: string;
  points_earned: number;
}

const Battles = () => {
  const navigate = useNavigate();
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const [availableBattles, setAvailableBattles] = useState<Battle[]>([]);
  const [battleHistory, setBattleHistory] = useState<BattleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  // current user
  const currentUser = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user") || "null")?.username || null
      );
    } catch {
      return null;
    }
  })();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userStats, setUserStats] = useState({
    rating: 1247,
    wins: 23,
    losses: 12,
    winRate: 65.7,
    rank: 42,
  });

  // Create battle form state
  const [battleTitle, setBattleTitle] = useState("");
  const [battleDuration, setBattleDuration] = useState(30);
  const [battleDifficulty, setBattleDifficulty] = useState("easy");
  const [battleLanguage, setBattleLanguage] = useState("python");
  const [battlePrize, setBattlePrize] = useState(25);

  const [challengesList, setChallengesList] = useState<any[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null,
  );
  const [opponentsList, setOpponentsList] = useState<string[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);

  // Load available and active battles from API and also fallback to challenges
  useEffect(() => {
    let mounted = true;
    let pollTimer: any = null;
    const load = async () => {
      setLoading(true);
      try {
        const settled = await Promise.allSettled([
          apiFetch("/api/battles?status=available"),
          apiFetch("/api/battles?status=active"),
          apiFetch("/api/challenges/list?page=1&per_page=10"),
          apiFetch("/api/battles?status=history"),
        ]);

        const wrap = async (entry: any) => {
          if (entry.status !== "fulfilled" || !entry.value) return null;
          try {
            const j = await entry.value.json().catch(() => null);
            return { resp: entry.value, json: j };
          } catch {
            return null;
          }
        };

        const [avail, active, chall, hist] = await Promise.all([
          wrap(settled[0]),
          wrap(settled[1]),
          wrap(settled[2]),
          wrap(settled[3]),
        ]);

        // available
        if (
          avail &&
          avail.resp.ok &&
          avail.json?.success &&
          Array.isArray(avail.json.data?.items)
        ) {
          setAvailableBattles(
            avail.json.data.items.map((b: any) => ({
              id: b._id || b.id,
              title: b.title,
              challenge_title: b.challenge_title || b.title,
              creator: b.creator || {
                username: b.creator?.username || "community",
              },
              status: b.status || "waiting",
              duration_minutes: b.duration_minutes || 30,
              difficulty: b.difficulty || "easy",
              language: b.language || "python",
              created_at: b.created_at || new Date().toISOString(),
              prize_points: b.prize_points || 25,
            })),
          );
        } else if (
          chall &&
          chall.resp.ok &&
          chall.json?.success &&
          Array.isArray(chall.json.data?.items)
        ) {
          setAvailableBattles(
            chall.json.data.items.map((c: any, idx: number) => ({
              id: Number(String(c._id).slice(-6)) || idx + 1000,
              title: c.title,
              challenge_title: c.title,
              creator: {
                id: 0,
                username: c.author || "community",
                rating: 1200,
              },
              status: "waiting" as const,
              duration_minutes: 30,
              difficulty: c.difficulty || "easy",
              language:
                (c.supported_languages && c.supported_languages[0]) || "python",
              created_at: c.publish_date || new Date().toISOString(),
              prize_points: c.points || 25,
            })),
          );
        } else {
          setAvailableBattles([]);
        }

        // active
        if (
          active &&
          active.resp.ok &&
          active.json?.success &&
          Array.isArray(active.json.data?.items)
        ) {
          setActiveBattles(
            active.json.data.items.map((b: any) => ({
              id: b._id || b.id,
              title: b.title,
              challenge_title: b.challenge_title || b.title,
              creator: b.creator || {
                username: b.creator?.username || "community",
              },
              opponent: b.opponent || null,
              status: b.status || "in_progress",
              duration_minutes: b.duration_minutes || 30,
              difficulty: b.difficulty || "easy",
              language: b.language || "python",
              created_at: b.created_at || new Date().toISOString(),
              started_at: b.started_at || null,
              prize_points: b.prize_points || 25,
            })),
          );
        } else {
          setActiveBattles([]);
        }

        // history
        if (
          hist &&
          hist.resp.ok &&
          hist.json?.success &&
          Array.isArray(hist.json.data?.items)
        ) {
          setBattleHistory(
            hist.json.data.items.map((r: any) => ({
              id: r._id || r.id,
              challenge_title: r.challenge_title || r.title || "",
              opponent_username:
                r.opponent?.username ||
                (r.creator?.username || "") === currentUser
                  ? "You"
                  : r.opponent?.username || "",
              result: r.winner
                ? r.winner === currentUser
                  ? "won"
                  : "lost"
                : "draw",
              your_score: r.your_score || 0,
              opponent_score: r.opponent_score || 0,
              duration: r.duration_minutes || 0,
              completed_at:
                r.completed_at || r.updated_at || new Date().toISOString(),
              points_earned: r.prize_points || 0,
            })),
          );
        } else {
          setBattleHistory([]);
        }
      } catch (e) {
        console.error("Failed to load battles", e);
        setAvailableBattles([]);
        setActiveBattles([]);
        setBattleHistory([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    // initial load
    load();
    // poll every 20s
    pollTimer = setInterval(() => {
      load();
    }, 20000);

    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  // fetch challenges and leaderboard when opening create dialog
  useEffect(() => {
    if (!showCreateDialog) return;
    let mounted = true;
    const loadExtras = async () => {
      try {
        const [chResp, lbResp] = await Promise.all([
          apiFetch("/api/challenges/list?page=1&per_page=50"),
          apiFetch("/api/leaderboard"),
        ]);
        const chJson = await chResp.json().catch(() => null);
        const lbJson = await lbResp.json().catch(() => null);
        if (chResp.ok && chJson?.success && Array.isArray(chJson.data?.items)) {
          if (mounted) setChallengesList(chJson.data.items);
        }
        if (lbResp.ok && lbJson?.success && Array.isArray(lbJson.data?.items)) {
          const names = lbJson.data.items.map((u: any) => u.username);
          if (mounted) setOpponentsList(names);
        }
      } catch (e) {
        // ignore
      }
    };
    loadExtras();
    return () => {
      mounted = false;
    };
  }, [showCreateDialog]);

  // Derived filtered available battles (search + filters)
  const filteredAvailableBattles = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    return availableBattles
      .filter((b) => {
        if (difficultyFilter !== "all" && b.difficulty !== difficultyFilter)
          return false;
        if (languageFilter !== "all" && b.language !== languageFilter)
          return false;
        if (!term) return true;
        return (
          String(b.title || "")
            .toLowerCase()
            .includes(term) ||
          String(b.challenge_title || "")
            .toLowerCase()
            .includes(term) ||
          String(b.creator?.username || "")
            .toLowerCase()
            .includes(term)
        );
      })
      .sort(
        (a, z) =>
          new Date(z.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [availableBattles, searchTerm, difficultyFilter, languageFilter]);

  // helper to compute remaining time & progress for active battles
  const computeTimeInfo = (b: any) => {
    if (!b.started_at || !b.duration_minutes)
      return { remainingSec: null, progress: 0, label: null };
    const start = new Date(b.started_at).getTime();
    const durationMs = Number(b.duration_minutes || 0) * 60 * 1000;
    const end = start + durationMs;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((end - now) / 1000));
    const elapsed = Math.max(0, Math.min(durationMs, now - start));
    const progress = Math.round((elapsed / durationMs) * 100);
    const label =
      remaining <= 0
        ? "Ended"
        : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    return { remainingSec: remaining, progress, label };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case "won":
        return "text-green-600";
      case "lost":
        return "text-red-600";
      case "draw":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const handleQuickMatch = async () => {
    // Open the create dialog with quick defaults and allow selecting a challenge
    try {
      if (challengesList && challengesList.length > 0) {
        setSelectedChallengeId(
          String(challengesList[0]._id || challengesList[0].id),
        );
      }
      setBattleDuration(30);
      setBattleDifficulty("easy");
      setBattleLanguage("python");
      setBattlePrize(10);
      setShowCreateDialog(true);
    } catch (e) {
      console.error("Quick match setup error", e);
      setShowCreateDialog(true);
    }
  };

  const handleJoinBattle = async (battleId: any) => {
    try {
      const resp = await apiFetch("/api/battles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: battleId }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        navigate(`/battle/${d.data?.battle?._id || battleId}`);
      } else {
        console.error("Join battle failed", d);
        alert(d?.message || "Unable to join battle");
      }
    } catch (e) {
      console.error("Join battle network error", e);
      alert("Network error while joining battle");
    }
  };

  const handleChallenge = async (battle: any) => {
    try {
      // create a battle challenging the creator
      const opponent = battle.creator?.username;
      if (!opponent) return alert("No opponent available to challenge");
      const title = `Challenge: ${battle.title}`;
      const resp = await apiFetch("/api/battles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          challenge_title: battle.challenge_title,
          opponent_username: opponent,
          duration_minutes: battle.duration_minutes,
          difficulty: battle.difficulty,
          language: battle.language,
          prize_points: battle.prize_points,
        }),
      });
      // parse JSON or fallback to text
      let d: any = null;
      try {
        d = await resp.json();
      } catch (e) {
        try {
          d = await resp.text();
        } catch {
          d = null;
        }
      }
      if (resp.ok && d?.success) {
        const id = d.data?.id || d.data?.battle?._id;
        navigate(`/battle/${id}`);
      } else {
        console.error("Challenge failed", { status: resp.status, body: d });
        const message =
          (d && d.message) ||
          (typeof d === "string" ? d : null) ||
          "Unable to create challenge";
        alert(`${message} (status: ${resp.status})`);
      }
    } catch (e) {
      console.error("Challenge network error", e);
      alert("Network error while creating challenge");
    }
  };

  const handleSpectate = (battleId: number) => {
    navigate(`/battle/${battleId}/spectate`);
  };

  const handleCreateBattle = async () => {
    try {
      const challengeTitleFromSel = challengesList.find(
        (c) => String(c._id || c.id) === String(selectedChallengeId),
      )?.title;
      const payload: any = {
        title:
          battleTitle ||
          (challengeTitleFromSel
            ? `Battle: ${challengeTitleFromSel}`
            : "New Battle"),
        challenge_title: challengeTitleFromSel || battleTitle || "",
        duration_minutes: battleDuration,
        difficulty: battleDifficulty,
        language: battleLanguage,
        prize_points: battlePrize,
      };
      if (selectedChallengeId) payload.challenge_id = selectedChallengeId;
      if (selectedOpponent) payload.opponent_username = selectedOpponent;

      const resp = await apiFetch("/api/battles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // parse JSON or fallback to text for better error messages
      let d: any = null;
      try {
        d = await resp.json();
      } catch (e) {
        try {
          const txt = await resp.text();
          d = txt || null;
        } catch {
          d = null;
        }
      }

      if (resp.ok && d?.success) {
        // Build a local battle object and add to available or active lists immediately
        const id = d.data?.id || d.data?.battle?._id;
        const newBattle: any = {
          id: id || Date.now() + Math.floor(Math.random() * 1000),
          title: payload.title,
          challenge_title: payload.challenge_title,
          creator: {
            username: currentUser || d.data?.battle?.creator?.username || "You",
          },
          opponent: payload.opponent_username
            ? { username: payload.opponent_username }
            : null,
          status: payload.opponent_username ? "invited" : "waiting",
          duration_minutes: payload.duration_minutes,
          difficulty: payload.difficulty,
          language: payload.language,
          created_at: new Date().toISOString(),
          started_at: null,
          prize_points: payload.prize_points,
        };

        // Prepend to availableBattles
        setAvailableBattles((prev) => [newBattle, ...(prev || [])]);
        // If in_progress, also add to activeBattles
        if (newBattle.status === "in_progress") {
          setActiveBattles((prev) => [newBattle, ...(prev || [])]);
        }

        setShowCreateDialog(false);
        if (id) navigate(`/battle/${id}`);
        else window.location.reload();
      } else {
        console.error("Create battle failed", { status: resp.status, body: d });
        const message =
          (d && d.message) ||
          (typeof d === "string" ? d : null) ||
          "Unable to create battle";
        alert(`${message} (status: ${resp.status})`);
      }
    } catch (e) {
      console.error("Create battle network error", e);
      alert("Network error while creating battle");
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <SwordsIcon className="h-8 w-8 text-brand-600" />
            Coding Battles
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Challenge developers worldwide in real-time coding competitions.
            Test your skills and climb the leaderboard!
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* Gaming-style leaderboard */}
          <div className="md:col-span-1 order-last md:order-first">
            <BattleLeaderboardDialog />
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold text-brand-600">
                    {userStats.rating}
                  </p>
                </div>
                <TrophyIcon className="h-8 w-8 text-brand-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rank</p>
                  <p className="text-2xl font-bold">#{userStats.rank}</p>
                </div>
                <CrownIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wins</p>
                  <p className="text-2xl font-bold text-green-600">
                    {userStats.wins}
                  </p>
                </div>
                <FlameIcon className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Losses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {userStats.losses}
                  </p>
                </div>
                <TargetIcon className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{userStats.winRate}%</p>
                </div>
                <StarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button size="lg" onClick={handleQuickMatch} className="flex-1">
            <ZapIcon className="mr-2 h-5 w-5" />
            Quick Match
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="flex-1">
                <PlusIcon className="mr-2 h-5 w-5" />
                Create Battle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Battle</DialogTitle>
                <DialogDescription>
                  Set up a coding battle and challenge other developers.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-2">
                <div className="space-y-4 p-2">
                  <div>
                    <Label htmlFor="battle-challenge">Select Challenge</Label>
                    <Select
                      value={selectedChallengeId || "none"}
                      onValueChange={(v) => {
                        setSelectedChallengeId(v === "none" ? null : v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a challenge" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No specific challenge
                        </SelectItem>
                        {challengesList.map((c) => (
                          <SelectItem
                            key={String(c._id || c.id)}
                            value={String(c._id || c.id)}
                          >
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="battle-title">Battle Title</Label>
                    <Input
                      id="battle-title"
                      value={battleTitle}
                      onChange={(e) => setBattleTitle(e.target.value)}
                      placeholder="Enter battle title (optional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="opponent">Opponent (optional)</Label>
                    <Select
                      value={selectedOpponent || "none"}
                      onValueChange={(v) => {
                        setSelectedOpponent(v === "none" ? null : v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an opponent or leave open" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No opponent</SelectItem>
                        {opponentsList.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select
                      value={String(battleDuration)}
                      onValueChange={(v) => setBattleDuration(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={battleDifficulty}
                      onValueChange={setBattleDifficulty}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">Programming Language</Label>
                    <Select
                      value={battleLanguage}
                      onValueChange={setBattleLanguage}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="prize">Prize Points</Label>
                    <Input
                      id="prize"
                      value={String(battlePrize)}
                      onChange={(e) => setBattlePrize(Number(e.target.value))}
                      placeholder="25"
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreateBattle}>
                    Create Battle
                  </Button>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Battles</TabsTrigger>
            <TabsTrigger value="available">Available Battles</TabsTrigger>
            <TabsTrigger value="history">Battle History</TabsTrigger>
          </TabsList>

          {/* Active Battles Tab */}
          <TabsContent value="active">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Loading active battles...
                  </p>
                </div>
              ) : activeBattles.length > 0 ? (
                activeBattles.map((battle) => (
                  <Card
                    key={battle.id}
                    className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <PlayIcon className="h-5 w-5 text-green-600" />
                            {battle.title}
                          </CardTitle>
                          <CardDescription>
                            {battle.challenge_title}
                          </CardDescription>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          <TimerIcon className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {battle.creator.username === currentUser
                                  ? "You"
                                  : (battle.creator.username ||
                                      "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {battle.creator.username === currentUser
                                  ? "You"
                                  : battle.creator.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {battle.creator.rating} rating
                              </p>
                            </div>
                          </div>
                          <span className="text-2xl">⚔️</span>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {battle.opponent?.username === currentUser
                                  ? "You"
                                  : (battle.opponent?.username ||
                                      "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {battle.opponent?.username === currentUser
                                  ? "You"
                                  : battle.opponent?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {battle.opponent?.rating} rating
                              </p>
                            </div>
                          </div>
                        </div>
                        {(battle.creator &&
                          battle.creator.username === currentUser) ||
                        (battle.opponent &&
                          battle.opponent.username === currentUser) ? (
                          <Button
                            onClick={() => navigate(`/battle/${battle.id}`)}
                          >
                            <PlayIcon className="mr-2 h-4 w-4" />
                            Rejoin
                          </Button>
                        ) : (
                          <Button onClick={() => handleSpectate(battle.id)}>
                            <EyeIcon className="mr-2 h-4 w-4" />
                            Spectate
                          </Button>
                        )}
                      </div>
                      <Progress
                        value={computeTimeInfo(battle).progress}
                        className="mb-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {computeTimeInfo(battle).label
                          ? `Time left: ${computeTimeInfo(battle).label}`
                          : "Ongoing"}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <SwordsIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Active Battles
                    </h3>
                    <p className="text-muted-foreground">
                      No battles are currently in progress. Start a quick match
                      or join an available battle!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Available Battles Tab */}
          <TabsContent value="available">
            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search battles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={difficultyFilter}
                      onValueChange={setDifficultyFilter}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <FilterIcon className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={languageFilter}
                      onValueChange={setLanguageFilter}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <CodeIcon className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Available Battles */}
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredAvailableBattles.map((battle) => (
                    <Card
                      key={battle.id}
                      className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            className={getDifficultyColor(battle.difficulty)}
                          >
                            {battle.difficulty.charAt(0).toUpperCase() +
                              battle.difficulty.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {battle.language}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">
                          {battle.title}
                        </CardTitle>
                        <CardDescription>
                          {battle.challenge_title}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {battle.creator.username === currentUser
                                  ? "You"
                                  : (battle.creator.username ||
                                      "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {battle.creator.username === currentUser
                                  ? "You"
                                  : battle.creator.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {battle.creator.rating} rating
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-brand-600">
                              {battle.prize_points} pts
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatTimeAgo(battle.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                          <ClockIcon className="h-4 w-4" />
                          {battle.duration_minutes} minutes
                          <UsersIcon className="h-4 w-4 ml-2" />
                          1v1
                        </div>

                        <div className="flex gap-2">
                          {battle.status === "invited" &&
                          currentUser &&
                          String(battle.invited) === currentUser ? (
                            <>
                              <Button
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    const resp = await apiFetch(
                                      "/api/battles/accept",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ id: battle.id }),
                                      },
                                    );
                                    const d = await resp
                                      .json()
                                      .catch(() => null);
                                    if (resp.ok && d?.success) {
                                      navigate(
                                        `/battle/${d.data?.battle?._id || battle.id}`,
                                      );
                                    } else {
                                      alert(
                                        d?.message ||
                                          "Unable to accept invitation",
                                      );
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    alert(
                                      "Network error while accepting invitation",
                                    );
                                  }
                                }}
                              >
                                <PlayIcon className="mr-2 h-4 w-4" />
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={async () => {
                                  try {
                                    const resp = await apiFetch(
                                      "/api/battles/decline",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ id: battle.id }),
                                      },
                                    );
                                    const d = await resp
                                      .json()
                                      .catch(() => null);
                                    if (resp.ok && d?.success) {
                                      // reload available battles
                                      window.location.reload();
                                    } else {
                                      alert(
                                        d?.message ||
                                          "Unable to decline invitation",
                                      );
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    alert(
                                      "Network error while declining invitation",
                                    );
                                  }
                                }}
                              >
                                Decline
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                className="flex-1"
                                onClick={() => handleJoinBattle(battle.id)}
                              >
                                <SwordsIcon className="mr-2 h-4 w-4" />
                                Join Battle
                              </Button>
                              {currentUser &&
                                battle.creator?.username &&
                                battle.creator.username !== currentUser && (
                                  <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleChallenge(battle)}
                                  >
                                    <ZapIcon className="mr-2 h-4 w-4" />
                                    Challenge
                                  </Button>
                                )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Battle History Tab */}
          <TabsContent value="history">
            <div className="space-y-4">
              {battleHistory.map((result) => (
                <Card key={result.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            result.result === "won"
                              ? "bg-green-500"
                              : result.result === "lost"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
                        <div>
                          <h4 className="font-semibold">
                            {result.challenge_title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            vs {result.opponent_username}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium">Score</p>
                          <p className={getResultColor(result.result)}>
                            {result.your_score} - {result.opponent_score}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Duration</p>
                          <p className="text-muted-foreground">
                            {result.duration}m
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Points</p>
                          <p
                            className={
                              result.points_earned > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {result.points_earned > 0 ? "+" : ""}
                            {result.points_earned}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Result</p>
                          <Badge
                            className={
                              result.result === "won"
                                ? "bg-green-100 text-green-800"
                                : result.result === "lost"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {result.result.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Battles;
