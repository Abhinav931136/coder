import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import {
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  TrophyIcon,
  MapPinIcon,
  ExternalLinkIcon,
  GiftIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlayCircleIcon,
  PlusIcon,
  StarIcon,
  CodeIcon,
} from "lucide-react";

interface Hackathon {
  id: number | string;
  title: string;
  description: string;
  organizer: { name: string; logo?: string; type: string };
  status: "upcoming" | "ongoing" | "completed" | string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  location?: { type?: string; venue?: string; city?: string };
  theme?: string;
  tracks?: string[];
  prizes?: any;
  participants?: { registered?: number; maxCapacity?: number; teams?: number };
  difficulty?: string;
  tags?: string[];
  requirements?: string[];
  schedule?: any[];
  judges?: any[];
  sponsors?: any[];
  isRegistered?: boolean;
  teamId?: number;
}

const Hackathons = () => {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [filteredHackathons, setFilteredHackathons] = useState<Hackathon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = await import("@/lib/api");
        const resp = await api.apiFetch("/api/hackathons");
        let json: any = null;
        try {
          json = await resp.json();
        } catch (e) {
          json = null;
        }
        let items: Hackathon[] = [];
        if (resp.ok && json?.success && Array.isArray(json.data?.items))
          items = json.data.items;
        else if (Array.isArray(json)) items = json;
        else if (json && Array.isArray(json.items)) items = json.items;
        if (mounted) {
          setHackathons(items);
          setFilteredHackathons(items);
        }
      } catch (e: any) {
        console.error("Failed to load hackathons", e);
        if (mounted) {
          setHackathons([]);
          setFilteredHackathons([]);
          setError("Failed to load hackathons");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  // Filters
  useEffect(() => {
    let filtered = hackathons.slice();
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          (h.title || "").toLowerCase().includes(term) ||
          (h.description || "").toLowerCase().includes(term) ||
          (h.theme || "").toLowerCase().includes(term),
      );
    }
    if (statusFilter !== "all")
      filtered = filtered.filter((h) => h.status === statusFilter);
    if (difficultyFilter !== "all")
      filtered = filtered.filter((h) => h.difficulty === difficultyFilter);
    setFilteredHackathons(filtered);
  }, [hackathons, searchTerm, statusFilter, difficultyFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "upcoming":
        return <ClockIcon className="h-4 w-4" />;
      case "ongoing":
        return <PlayCircleIcon className="h-4 w-4" />;
      case "completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <AlertCircleIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getTabHackathons = (status: string) => {
    if (status === "all") return filteredHackathons;
    return filteredHackathons.filter((h) => h.status === status);
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">Hackathons</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover and join upcoming and ongoing hackathons. Browse themes,
            tracks, prizes and register to participate.
          </p>
        </div>

        {/* Dynamic hero: show next upcoming or summary */}
        <Card className="mb-8 bg-card border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                {hackathons && hackathons.length > 0 ? (
                  (() => {
                    const upcoming = hackathons
                      .filter((h) => h.status === "upcoming" && h.startDate)
                      .sort(
                        (a, b) =>
                          new Date(a.startDate || "").getTime() -
                          new Date(b.startDate || "").getTime(),
                      );
                    const next = upcoming[0] || null;
                    return next ? (
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Next: {next.title}
                        </h3>
                        <p className="text-muted-foreground mb-2">
                          {next.theme || "Multiple tracks"} •{" "}
                          {next.tracks?.slice(0, 3).join(", ") ||
                            "Various tracks"}
                        </p>
                        <p className="text-sm text-gray-700">
                          Starts: {formatDate(next.startDate)} • Ends:{" "}
                          {formatDate(next.endDate)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Explore Hackathons
                        </h3>
                        <p className="text-muted-foreground">
                          We have {hackathons.length} hackathons available —
                          find one that fits your interests.
                        </p>
                        <div className="mt-3 flex gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-100 text-indigo-800">
                              Total: {hackathons.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              Upcoming: {getTabHackathons("upcoming").length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">
                              Ongoing: {getTabHackathons("ongoing").length}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      No hackathons yet
                    </h3>
                    <p className="text-muted-foreground">
                      Check back later or create a new hackathon if you're an
                      organizer.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-center">
                <div className="mb-2">
                  {hackathons && hackathons.length > 0 ? (
                    <img
                      src={
                        hackathons[0].organizer?.logo || "/placeholder-logo.png"
                      }
                      alt={hackathons[0].organizer?.name || "Organizer"}
                      className="h-16 w-auto mx-auto rounded"
                      onError={(e: any) => {
                        e.currentTarget.src = "/placeholder-logo.png";
                      }}
                    />
                  ) : (
                    <div className="h-16 w-16 bg-indigo-100 rounded flex items-center justify-center text-indigo-700 font-semibold">
                      HD
                    </div>
                  )}
                </div>

                {(() => {
                  try {
                    const u = JSON.parse(
                      localStorage.getItem("user") || "null",
                    );
                    if (
                      u &&
                      (u.role === "platform_admin" || u.role === "instructor")
                    ) {
                      return (
                        <Button className="flex-shrink-0" asChild>
                          <a href="/admin/hackathons">
                            <PlusIcon className="mr-2 h-4 w-4" />
                            Create Hackathon
                          </a>
                        </Button>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hackathons by title, theme, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <FilterIcon className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="upcoming">
              Upcoming ({getTabHackathons("upcoming").length})
            </TabsTrigger>
            <TabsTrigger value="ongoing">
              Ongoing ({getTabHackathons("ongoing").length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({getTabHackathons("completed").length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({filteredHackathons.length})
            </TabsTrigger>
          </TabsList>

          {["upcoming", "ongoing", "completed", "all"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid lg:grid-cols-2 gap-6">
                {getTabHackathons(tab === "all" ? "all" : tab).map(
                  (hackathon, idx) => (
                    <Card
                      key={String(
                        hackathon._id ?? hackathon.id ?? `${tab}-${idx}`,
                      )}
                      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {hackathon.organizer?.logo ? (
                                <AvatarImage
                                  src={hackathon.organizer.logo}
                                  alt={hackathon.organizer.name}
                                />
                              ) : (
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs dark:bg-zinc-800 dark:text-zinc-200">
                                  {(hackathon.organizer?.name || "")
                                    .split(" ")
                                    .map((w) => w[0])
                                    .join("")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-sm text-muted-foreground">
                              {hackathon.organizer?.name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(hackathon.status)}>
                              {getStatusIcon(hackathon.status)}
                              <span className="ml-1 capitalize">
                                {hackathon.status}
                              </span>
                            </Badge>
                            <Badge
                              className={getDifficultyColor(
                                hackathon.difficulty || "",
                              )}
                            >
                              {hackathon.difficulty || "-"}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg text-foreground group-hover:underline transition-colors">
                          {hackathon.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {(hackathon.description || "").substring(0, 150)}...
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-blue-600 mb-2">
                              {hackathon.theme}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(hackathon.tracks || [])
                                .slice(0, 3)
                                .map((track) => (
                                  <Badge
                                    key={track}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {track}
                                  </Badge>
                                ))}
                              {(hackathon.tracks || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(hackathon.tracks || []).length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{formatDate(hackathon.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPinIcon className="h-4 w-4" />
                              <span className="capitalize">
                                {hackathon.location?.type || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <UsersIcon className="h-4 w-4" />
                              <span>
                                {hackathon.participants?.registered || 0}/
                                {hackathon.participants?.maxCapacity || 0}{" "}
                                registered
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-green-600">
                              <TrophyIcon className="h-4 w-4" />
                              <span className="font-medium text-foreground">
                                {
                                  ((hackathon.prizes?.first || "") + "").split(
                                    " ",
                                  )[0]
                                }
                              </span>
                            </div>
                          </div>

                          <Separator />

                          <div className="flex justify-between items-center">
                            <div className="flex gap-2 text-xs">
                              {(hackathon.tags || []).slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  to={`/hackathon/${hackathon._id || hackathon.id}`}
                                >
                                  View Details
                                </Link>
                              </Button>
                              {hackathon.status === "upcoming" && !hackathon.isRegistered && (
                                hackathon.registrationUrl ? (
                                  <Button size="sm" asChild>
                                    <a href={hackathon.registrationUrl} target="_blank" rel="noopener noreferrer">
                                      <UsersIcon className="mr-2 h-4 w-4" />
                                      Register
                                    </a>
                                  </Button>
                                ) : (
                                  <Button size="sm">
                                    <UsersIcon className="mr-2 h-4 w-4" />
                                    Register
                                  </Button>
                                )
                              )}
                              {hackathon.status === "upcoming" && hackathon.isRegistered && (
                                <Button size="sm" variant="secondary">
                                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                                  Registered
                                </Button>
                              )}
                              {hackathon.status === "ongoing" && hackathon.isRegistered && (
                                hackathon.registrationUrl ? (
                                  <Button size="sm" asChild>
                                    <a href={hackathon.registrationUrl} target="_blank" rel="noopener noreferrer">
                                      <CodeIcon className="mr-2 h-4 w-4" />
                                      Continue
                                    </a>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CodeIcon className="mr-2 h-4 w-4" />
                                    Continue
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>

              {getTabHackathons(tab === "all" ? "all" : tab).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrophyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No {tab === "all" ? "" : tab + " "}hackathons found
                    </h3>
                    <p className="text-muted-foreground">
                      {tab === "all"
                        ? "Try adjusting your search criteria"
                        : `No ${tab} hackathons match your search`}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {loading && (
          <div className="text-center py-6">Loading hackathons...</div>
        )}
        {error && <div className="text-center text-red-600 py-6">{error}</div>}
      </div>
    </Layout>
  );
};

export default Hackathons;
