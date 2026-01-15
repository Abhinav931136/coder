import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  SearchIcon,
  FilterIcon,
  TrophyIcon,
  MedalIcon,
  CrownIcon,
  StarIcon,
  ZapIcon,
  CodeIcon,
  UsersIcon,
  TargetIcon,
  TrendingUpIcon,
  CalendarIcon,
  SchoolIcon,
  AwardIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";

interface LeaderboardUser {
  id: string | number;
  rank: number;
  previousRank?: number;
  username: string;
  fullName: string;
  avatar: string;
  institution?: {
    name: string;
    logo?: string;
    shortName?: string;
  } | null;
  location?: string;
  // Adjusted total (server may return adjusted totalPoints)
  totalPoints: number;
  // Raw points (original points before adjustments) - optional
  rawPoints?: number;
  stats: {
    challengesSolved: number;
    // points from challenges (if provided by server)
    challengePoints?: number;
    battlesWon: number;
    // points from battles (if provided by server)
    battlePoints?: number;
    battlesLost: number;
    hackathonsParticipated: number;
    hackathonsWon: number;
    currentStreak: number;
    longestStreak: number;
    avgRating: number;
    specializations: string[];
  };
  achievements?: string[];
  joinDate?: string | Date;
  lastActive?: string | Date;
  isCurrentUser?: boolean;
}

const SORT_FIELDS = [
  { value: "points", label: "Points" },
  { value: "challenges", label: "Challenges Solved" },
  { value: "battles", label: "Battles Won" },
  { value: "rating", label: "Avg Rating" },
];

const Leaderboard = () => {
  const lastPayloadRef = useRef<string | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all-time");
  const [category, setCategory] = useState("overall");
  const [showTop, setShowTop] = useState(50);
  const [sortBy, setSortBy] = useState("points");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | number | null>(
    null,
  );

  // Load leaderboard from server (robust: handles non-standard responses and falls back to native fetch)

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    let lastResp: Response | null = null;
    try {
      const api = await import("@/lib/api");
      const resp = await api.apiFetch("/api/leaderboard");
      lastResp = resp as unknown as Response;

      // try to parse JSON safely
      let json: any = null;
      try {
        json = await resp.json();
      } catch (e) {
        json = null;
      }

      // Accept several valid shapes:
      // { success: true, data: { items: [...] } }
      // or directly an array
      let newData: LeaderboardUser[] | null = null;
      if (json && Array.isArray(json)) {
        newData = json as LeaderboardUser[];
      } else if (json && json.data && Array.isArray(json.data.items)) {
        newData = json.data.items as LeaderboardUser[];
      } else if ((resp as any)?.ok) {
        // fall through to native fetch fallback
      }

      if (!newData) {
        // try native fetch fallback (relative path) before failing
        try {
          const base = (import.meta.env.VITE_API_BASE as string) || "";
          const fallbackUrl = base
            ? (base.endsWith("/") ? base.slice(0, -1) : base) +
              "/api/leaderboard"
            : "/api/leaderboard";
          const nativeResp = await fetch(fallbackUrl, {
            credentials: "include",
          });
          lastResp = nativeResp;
          try {
            const nativeJson = await nativeResp.json();
            if (
              nativeJson &&
              nativeJson.data &&
              Array.isArray(nativeJson.data.items)
            ) {
              newData = nativeJson.data.items as LeaderboardUser[];
            } else if (Array.isArray(nativeJson)) {
              newData = nativeJson as LeaderboardUser[];
            }
          } catch (e) {
            // ignore parse errors and continue to set error
          }
        } catch (e) {
          // ignore native fetch errors
        }
      }

      if (newData) {
        const payloadStr = JSON.stringify(newData);
        if (lastPayloadRef.current !== payloadStr) {
          lastPayloadRef.current = payloadStr;
          setLeaderboardData(newData);
        }
        return;
      }

      // if reached here, we couldn't parse leaderboard
      const status = (lastResp && (lastResp as any).status) || 0;
      setError(`Failed to load leaderboard (status: ${status})`);
    } catch (e: any) {
      console.error("Leaderboard load error", e);
      setError("Failed to load leaderboard (network)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    const iv = setInterval(() => {
      loadLeaderboard();
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Derived institution representation from the full dataset (not only filtered)
  const institutionRep = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; logo?: string; count: number }
    >();
    for (const u of leaderboardData) {
      const key = (
        u.institution?.shortName ||
        u.institution?.name ||
        "Independent"
      ).toString();
      const curr = counts.get(key) || {
        name: u.institution?.name || "Independent",
        logo: u.institution?.logo,
        count: 0,
      };
      curr.count += 1;
      counts.set(key, curr);
    }
    let top: {
      key: string;
      name: string;
      logo?: string;
      count: number;
    } | null = null;
    for (const [key, val] of counts.entries()) {
      if (!top || val.count > top.count)
        top = { key, name: val.name, logo: val.logo, count: val.count };
    }
    return { counts, top };
  }, [leaderboardData]);

  // Apply search, filters and sorting then slice to showTop
  const filteredData = useMemo(() => {
    let data = [...leaderboardData];

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      data = data.filter((user) => {
        const full = (user.fullName || "").toLowerCase();
        const uname = (user.username || "").toLowerCase();
        const inst = (user.institution?.name || "").toLowerCase();
        return (
          full.includes(term) || uname.includes(term) || inst.includes(term)
        );
      });
    }

    if (institutionFilter !== "all") {
      if (institutionFilter === "dbuu") {
        data = data.filter(
          (u) => (u.institution?.shortName || "").toLowerCase() === "dbuu",
        );
      } else if (institutionFilter === "iit") {
        data = data.filter((u) =>
          (u.institution?.name || "").toLowerCase().includes("iit"),
        );
      } else if (institutionFilter === "other") {
        data = data.filter((u) => !u.institution);
      } else {
        data = data.filter(
          (u) =>
            (
              u.institution?.shortName ||
              u.institution?.name ||
              ""
            ).toLowerCase() === institutionFilter.toLowerCase(),
        );
      }
    }

    // timePeriod & category currently not used server-side; keep hooks for future server filters

    // Sorting
    data.sort((a, b) => {
      let av = 0;
      let bv = 0;
      switch (sortBy) {
        case "points":
          av = a.totalPoints;
          bv = b.totalPoints;
          break;
        case "challenges":
          av = a.stats.challengesSolved || 0;
          bv = b.stats.challengesSolved || 0;
          break;
        case "battles":
          av = a.stats.battlesWon || 0;
          bv = b.stats.battlesWon || 0;
          break;
        case "rating":
          av = a.stats.avgRating || 0;
          bv = b.stats.avgRating || 0;
          break;
        default:
          av = a.totalPoints;
          bv = b.totalPoints;
      }
      if (sortDir === "desc") return bv - av;
      return av - bv;
    });

    // ensure rank order consistent if server provided ranks
    // but recalc displayed rank after filters/sort
    const mapped = data.map(
      (u, idx) => ({ ...u, displayRank: idx + 1 }) as any,
    );

    return mapped.slice(0, showTop);
  }, [
    leaderboardData,
    debouncedSearch,
    institutionFilter,
    sortBy,
    sortDir,
    showTop,
  ]);

  const toggleExpand = (id: string | number) => {
    setExpandedUser((prev) => (prev === id ? null : id));
  };

  const onClickInstitution = (shortName?: string, name?: string) => {
    if (!shortName && !name) return;
    const key = (shortName || name || "").toLowerCase();
    // if clicking current filter, toggle back to all
    if (institutionFilter === key) setInstitutionFilter("all");
    else setInstitutionFilter(key);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <CrownIcon className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <MedalIcon className="h-5 w-5 text-gray-400" />;
      case 3:
        return <MedalIcon className="h-5 w-5 text-orange-500" />;
      default:
        return (
          <span className="text-lg font-bold text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankChange = (user: LeaderboardUser) => {
    if (!user.previousRank) return null;
    const change = (user.previousRank || 0) - user.rank;
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600 text-xs">
          <ChevronUpIcon className="h-3 w-3" />
          <span>+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600 text-xs">
          <ChevronDownIcon className="h-3 w-3" />
          <span>{change}</span>
        </div>
      );
    }
    return <div className="text-xs text-muted-foreground">—</div>;
  };

  const getSpecializationBadges = (specializations: string[] = []) => {
    return specializations.slice(0, 2).map((spec) => (
      <Badge key={spec} variant="secondary" className="text-xs">
        {spec}
      </Badge>
    ));
  };

  const currentUserData = leaderboardData.find((user) => user.isCurrentUser);

  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            Global Leaderboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            See how you rank against other developers across categories and
            institutions.
          </p>
        </div>

        {currentUserData && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    {getRankIcon(currentUserData.rank)}
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Rank
                    </p>
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentUserData.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {(
                        currentUserData.fullName ||
                        currentUserData.username ||
                        ""
                      )
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-blue-900">
                      {currentUserData.fullName}
                    </h3>
                    <p className="text-blue-700">@{currentUserData.username}</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-lg text-blue-900">
                      {currentUserData.totalPoints.toLocaleString()}
                    </p>
                    <p className="text-blue-600">Total Points</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <div>
                        Raw:{" "}
                        {(
                          currentUserData.rawPoints ||
                          currentUserData.totalPoints ||
                          0
                        ).toLocaleString()}
                      </div>
                      <div>
                        From Challenges:{" "}
                        {(
                          currentUserData.stats.challengePoints || 0
                        ).toLocaleString()}
                      </div>
                      <div>
                        From Battles:{" "}
                        {(
                          currentUserData.stats.battlePoints || 0
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-green-600">
                      {currentUserData.stats.challengesSolved}
                    </p>
                    <p className="text-muted-foreground">Challenges</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-purple-600">
                      {currentUserData.stats.battlesWon}
                    </p>
                    <p className="text-muted-foreground">Battles Won</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg text-orange-600">
                      {currentUserData.stats.currentStreak}
                    </p>
                    <p className="text-muted-foreground">Current Streak</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 w-full lg:w-auto">
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger className="w-full lg:w-40">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-time">All Time</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="weekly">This Week</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full lg:w-40">
                    <TrophyIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overall">Overall</SelectItem>
                    <SelectItem value="challenges">Challenges</SelectItem>
                    <SelectItem value="battles">Battles</SelectItem>
                    <SelectItem value="hackathons">Hackathons</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={institutionFilter}
                  onValueChange={setInstitutionFilter}
                >
                  <SelectTrigger className="w-full lg:w-40">
                    <SchoolIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutions</SelectItem>
                    <SelectItem value="dbuu">DBUU</SelectItem>
                    <SelectItem value="iit">IITs</SelectItem>
                    <SelectItem value="other">Independent</SelectItem>
                    {Array.from(institutionRep.counts.entries()).map(
                      ([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                <Select
                  value={showTop.toString()}
                  onValueChange={(v) => setShowTop(parseInt(v))}
                >
                  <SelectTrigger className="w-full lg:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="25">Top 25</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="100">Top 100</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full lg:w-40">
                    <FilterIcon className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        Sort by {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="ml-2"
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
                >
                  {sortDir === "desc" ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronUpIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {institutionRep.top && (
          <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={institutionRep.top.logo || "/placeholder-logo.png"}
                    alt={`${institutionRep.top.name} Logo`}
                    className="h-12 w-auto"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-logo.png";
                    }}
                  />
                  <div>
                    <h3 className="text-xl font-bold text-green-900 mb-1">
                      {institutionRep.top.name}
                    </h3>
                    <p className="text-green-700">
                      Leading with {institutionRep.top.count} students in top
                      rankings
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                    onClick={() => onClickInstitution(institutionRep.top?.key)}
                  >
                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
                    Filter by Institution
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="h-5 w-5" />
              Top {showTop} Developers
            </CardTitle>
            <CardDescription>
              Rankings based on overall performance across challenges, battles,
              and hackathons
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-6">Loading leaderboard...</div>
              )}

              {!loading && error && (
                <div className="text-center py-6 text-red-600">{error}</div>
              )}

              {!loading && !error && filteredData.length === 0 && (
                <div className="text-center py-8">
                  <TrophyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No users found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                filteredData.map((user: any) => (
                  <div
                    key={user.id}
                    className={`rounded-lg border transition-colors ${user.isCurrentUser ? "bg-blue-50 border-blue-200" : "hover:bg-muted/50"}`}
                  >
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => toggleExpand(user.id)}
                    >
                      <div className="flex flex-col items-center gap-1 w-16">
                        {getRankIcon(user.displayRank || user.rank)}
                        {getRankChange(user)}
                      </div>

                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={user.avatar || "/placeholder-avatar.jpg"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 font-semibold">
                            {(user.fullName || user.username || "")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to={`/profile?username=${user.username}`}
                              className="font-semibold hover:underline"
                            >
                              {user.fullName}
                            </Link>
                            {user.isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">
                                You
                              </Badge>
                            )}
                            {(user.achievements || []).includes(
                              "Grand Master",
                            ) && (
                              <CrownIcon className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>@{user.username}</span>
                            {user.institution && (
                              <>
                                <span>•</span>
                                <div
                                  className="flex items-center gap-1 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClickInstitution(
                                      user.institution?.shortName,
                                      user.institution?.name,
                                    );
                                  }}
                                >
                                  <img
                                    src={
                                      user.institution.logo ||
                                      "/placeholder-logo.png"
                                    }
                                    alt={user.institution.shortName}
                                    className="h-4 w-4"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/placeholder-logo.png";
                                    }}
                                  />
                                  <span>
                                    {user.institution.shortName ||
                                      user.institution.name}
                                  </span>
                                </div>
                              </>
                            )}
                            <span>•</span>
                            <span>{user.location || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-lg">
                            {(
                              (user.rawPoints ?? user.totalPoints) ||
                              0
                            ).toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">Points</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">
                            {user.stats.challengesSolved}
                          </p>
                          <p className="text-muted-foreground">Challenges</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-blue-600">
                            {user.stats.battlesWon}
                          </p>
                          <p className="text-muted-foreground">Battles</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-purple-600">
                            {user.stats.hackathonsWon}
                          </p>
                          <p className="text-muted-foreground">Hackathons</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-orange-600">
                            {user.stats.currentStreak}
                          </p>
                          <p className="text-muted-foreground">Streak</p>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="flex items-center gap-1 text-sm">
                          <StarIcon className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">
                            {user.stats.avgRating || 0}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                    </div>

                    {expandedUser === user.id && (
                      <div className="p-4 border-t bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold">Achievements</h4>
                            <div className="flex gap-2 flex-wrap mt-2">
                              {(user.achievements || []).length ? (
                                user.achievements.map((a: string) => (
                                  <Badge key={a}>{a}</Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">
                                  No achievements
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold">Stats</h4>
                            <div className="mt-2 text-sm space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-muted-foreground">
                                  Challenges Solved
                                </div>
                                <div className="font-medium">
                                  {user.stats.challengesSolved}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-muted-foreground">
                                  Battles Won
                                </div>
                                <div className="font-medium">
                                  {user.stats.battlesWon}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-muted-foreground">
                                  Current Streak
                                </div>
                                <div className="font-medium">
                                  {user.stats.currentStreak}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-muted-foreground">
                                  Avg Rating
                                </div>
                                <div className="font-medium">
                                  {user.stats.avgRating || 0}
                                </div>
                              </div>

                              <div className="mt-3 border-t pt-3">
                                <h5 className="text-sm font-medium">
                                  Points Breakdown
                                </h5>
                                <div className="mt-2 text-sm space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="text-muted-foreground">
                                      Total (adjusted)
                                    </div>
                                    <div className="font-medium">
                                      {(user.totalPoints || 0).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-muted-foreground">
                                      Raw Points
                                    </div>
                                    <div className="font-medium">
                                      {(
                                        user.rawPoints ||
                                        user.totalPoints ||
                                        0
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-muted-foreground">
                                      From Challenges
                                    </div>
                                    <div className="font-medium">
                                      {(
                                        user.stats.challengePoints || 0
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-muted-foreground">
                                      From Battles
                                    </div>
                                    <div className="font-medium">
                                      {(
                                        user.stats.battlePoints || 0
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold">Member since</h4>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {user.joinDate
                                ? new Date(user.joinDate).toLocaleDateString()
                                : "-"}
                            </div>
                            <h4 className="font-semibold mt-4">Last Active</h4>
                            <div className="mt-2 text-sm text-muted-foreground">
                              {user.lastActive
                                ? new Date(user.lastActive).toLocaleString()
                                : "-"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="font-semibold">Progress</h4>
                          <div className="mt-2 space-y-2">
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Challenges Solved
                              </div>
                              <Progress
                                value={Math.min(
                                  100,
                                  (user.stats.challengesSolved / 500) * 100,
                                )}
                              />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">
                                Battles Won
                              </div>
                              <Progress
                                value={Math.min(
                                  100,
                                  (user.stats.battlesWon / 200) * 100,
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {filteredData.length} of {leaderboardData.length} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTop(10);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Top 10
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTop(25);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Top 25
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTop(50);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Top 50
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTop(100);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Top 100
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(0, leaderboardData.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUpIcon className="inline h-3 w-3 mr-1" />
                Live updates every 30s
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {institutionFilter !== "all"
                  ? `${institutionFilter.toUpperCase()} Representation`
                  : `${institutionRep.top?.key || "Institution"} Representation`}
              </CardTitle>
              <SchoolIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const total = leaderboardData.length || 1;
                  if (institutionFilter !== "all") {
                    const key =
                      institutionFilter === "iit"
                        ? "iit"
                        : institutionFilter.toLowerCase();
                    const count = leaderboardData.filter((u) => {
                      if (institutionFilter === "dbuu")
                        return (
                          (u.institution?.shortName || "").toLowerCase() ===
                          "dbuu"
                        );
                      if (institutionFilter === "iit")
                        return (u.institution?.name || "")
                          .toLowerCase()
                          .includes("iit");
                      if (institutionFilter === "other") return !u.institution;
                      return (
                        (
                          u.institution?.shortName ||
                          u.institution?.name ||
                          ""
                        ).toLowerCase() === key
                      );
                    }).length;
                    return Math.round((count / total) * 100);
                  }
                  const topCount = institutionRep.top?.count || 0;
                  return Math.round((topCount / total) * 100);
                })()}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  if (institutionFilter !== "all") {
                    const count = leaderboardData.filter((u) => {
                      if (institutionFilter === "dbuu")
                        return (
                          (u.institution?.shortName || "").toLowerCase() ===
                          "dbuu"
                        );
                      if (institutionFilter === "iit")
                        return (u.institution?.name || "")
                          .toLowerCase()
                          .includes("iit");
                      if (institutionFilter === "other") return !u.institution;
                      return (
                        (
                          u.institution?.shortName ||
                          u.institution?.name ||
                          ""
                        ).toLowerCase() === institutionFilter.toLowerCase()
                      );
                    }).length;
                    return `${count} students in top ${showTop}`;
                  }
                  return `${institutionRep.top?.count || 0} students in top ${showTop}`;
                })()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <StarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const total = filteredData.length;
                  if (!total) return 0;
                  const sum = filteredData.reduce(
                    (acc: number, user: any) =>
                      acc + (user.stats.avgRating || 0),
                    0,
                  );
                  return Math.round(sum / total);
                })()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across visible top performers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
