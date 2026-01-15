import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, Link, useNavigate } from "react-router-dom";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  TrophyIcon,
  StarIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlayCircleIcon,
  ArrowLeftIcon,
  ExternalLinkIcon,
  ShareIcon,
  BookmarkIcon,
  CodeIcon,
  MessageSquareIcon,
  DownloadIcon,
  FileTextIcon,
  LinkIcon,
  GiftIcon,
  AwardIcon,
} from "lucide-react";

interface Hackathon {
  id: number;
  title: string;
  description: string;
  organizer: {
    name: string;
    logo: string;
    type: "university" | "company" | "community";
  };
  status: "upcoming" | "ongoing" | "completed";
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  location: {
    type: "online" | "hybrid" | "in-person";
    venue?: string;
    city?: string;
  };
  theme: string;
  tracks: string[];
  prizes: {
    first: string;
    second: string;
    third: string;
    special?: string[];
  };
  participants: {
    registered: number;
    maxCapacity: number;
    teams: number;
  };
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  requirements: string[];
  schedule: Array<{
    day: string;
    events: Array<{
      time: string;
      title: string;
      description: string;
    }>;
  }>;
  judges: Array<{
    name: string;
    title: string;
    company: string;
    image: string;
  }>;
  sponsors: Array<{
    name: string;
    logo: string;
    tier: "title" | "gold" | "silver" | "bronze";
  }>;
  rules: string[];
  submissionGuidelines: string[];
  resources: Array<{
    title: string;
    description: string;
    url: string;
    type: "document" | "video" | "link" | "tool";
  }>;
  isRegistered?: boolean;
  teamId?: number;
}

const HackathonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          // try API first
          const resp = await apiFetch(`/api/hackathons/${id}`);
          let j: any = null;
          try {
            j = await resp.json();
          } catch {}
          if (resp.ok && j?.success && j.data?.hackathon) {
            const h = j.data.hackathon;
            // normalize _id
            if (h._id) h._id = String(h._id);
            if (mounted) setHackathon(h);
            return;
          }
        }

        // Fallback to sample/mock (for local dev or when API misses)
        const sample = {
          id: 1,
          title: "TechnoVation 2024 - Innovation Challenge",
          description:
            "Join Dev Bhoomi Uttarakhand University's flagship hackathon focused on solving real-world problems through innovative technology solutions.",
          organizer: {
            name: "Dev Bhoomi Uttarakhand University",
            logo: "https://www.dbuu.ac.in/assets/images/logo/devbhoomi-logo.webp",
            type: "university",
          },
          status: "upcoming",
          startDate: "2024-03-15T09:00:00Z",
          endDate: "2024-03-17T18:00:00Z",
          registrationDeadline: "2024-03-10T23:59:59Z",
          location: {
            type: "hybrid",
            venue: "DBUU Main Campus",
            city: "Dehradun",
          },
          theme: "Technology for Sustainable Development",
          tracks: ["AI/ML & Data Science", "IoT & Smart Cities"],
          prizes: { first: "₹1,00,000", second: "₹50,000", third: "₹25,000" },
          participants: { registered: 245, maxCapacity: 400, teams: 61 },
          difficulty: "intermediate",
          tags: ["innovation", "sustainability"],
          requirements: ["Students from any university"],
          schedule: [],
          judges: [],
          sponsors: [],
          rules: [],
          submissionGuidelines: [],
          resources: [],
          isRegistered: false,
        };

        if (mounted) setHackathon(sample);
      } catch (e) {
        console.error("Failed to load hackathon", e);
        if (mounted) setHackathon(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ongoing":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRegistrationProgress = () => {
    if (!hackathon) return 0;
    return (
      (hackathon.participants.registered / hackathon.participants.maxCapacity) *
      100
    );
  };

  const getDaysUntilStart = () => {
    if (!hackathon) return 0;
    const start = new Date(hackathon.startDate);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!hackathon) {
    return (
      <Layout>
        <div className="container py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Hackathon Not Found
              </h3>
              <p className="text-muted-foreground mb-4">
                The hackathon you're looking for doesn't exist or has been
                removed.
              </p>
              <Button onClick={() => navigate("/hackathons")}>
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Hackathons
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/hackathons")}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Hackathons
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={hackathon.organizer.logo}
                  alt={hackathon.organizer.name}
                />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                  {(hackathon.organizer?.name || "")
                    .toString()
                    .split(" ")
                    .filter(Boolean)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2) ||
                    (hackathon.organizer?.name
                      ? hackathon.organizer.name.slice(0, 2)
                      : "HD")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {hackathon.title}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Organized by {hackathon.organizer.name}</span>
                  <span>•</span>
                  <span>{hackathon.location.city}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {hackathon.registrationUrl && (
                <Button variant="default" size="sm" asChild>
                  <a href={hackathon.registrationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
                    Register / Proceed
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm">
                <ShareIcon className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <BookmarkIcon className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={getStatusColor(hackathon.status)}>
              {getStatusIcon(hackathon.status)}
              <span className="ml-1 capitalize">{hackathon.status}</span>
            </Badge>
            <Badge className={getDifficultyColor(hackathon.difficulty)}>
              {hackathon.difficulty}
            </Badge>
            <Badge variant="outline">{hackathon.location.type}</Badge>
            {(hackathon.tags || []).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <p className="text-xl text-muted-foreground leading-relaxed">
            {hackathon.description}
          </p>
        </div>

        {/* Key Info Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <CalendarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Event Dates</h3>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const s = formatDate(hackathon.startDate || "");
                  return s && s.includes(",") ? s.split(",")[1].trim() : s;
                })()}{" "}
                -{" "}
                {(() => {
                  const e = formatDate(hackathon.endDate || "");
                  return e && e.includes(",") ? e.split(",")[1].trim() : e;
                })()}
              </p>
              {hackathon.status === "upcoming" && (
                <Badge variant="outline" className="mt-2">
                  {getDaysUntilStart()} days to go
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <UsersIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Participants</h3>
              <p className="text-2xl font-bold text-green-600">
                {hackathon.participants.registered}
              </p>
              <p className="text-sm text-muted-foreground">
                / {hackathon.participants.maxCapacity} max
              </p>
              <Progress value={getRegistrationProgress()} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrophyIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Prize Pool</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {(
                  ((hackathon.prizes && hackathon.prizes.first) || "") + ""
                ).split(" ")[0] || "-"}
              </p>
              <p className="text-sm text-muted-foreground">
                + perks & opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <UsersIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Teams</h3>
              <p className="text-2xl font-bold text-purple-600">
                {hackathon.participants.teams}
              </p>
              <p className="text-sm text-muted-foreground">registered teams</p>
            </CardContent>
          </Card>
        </div>

        {/* Registration CTA */}
        {hackathon.status === "upcoming" && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 mb-2">
                    Ready to participate?
                  </h3>
                  <p className="text-blue-700 mb-2">
                    Registration closes on{" "}
                    {formatDate(hackathon.registrationDeadline)}
                  </p>
                  <p className="text-sm text-blue-600">
                    Join {hackathon.participants.registered} other participants
                    in this exciting challenge!
                  </p>
                </div>
                <div className="text-center">
                  {hackathon.isRegistered ? (
                    <Button size="lg" variant="secondary">
                      <CheckCircleIcon className="mr-2 h-5 w-5" />
                      Registered
                    </Button>
                  ) : (
                    <Button size="lg">
                      <UsersIcon className="mr-2 h-5 w-5" />
                      Register Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
            <TabsTrigger value="judges">Judges</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Theme and Tracks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Theme & Tracks</CardTitle>
                    <CardDescription>
                      Focus areas for this hackathon
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <h4 className="font-semibold text-lg text-blue-600 mb-2">
                        {hackathon.theme}
                      </h4>
                      <p className="text-muted-foreground mb-4">
                        Choose one or more tracks to focus your solution on:
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(hackathon.tracks || []).map((track) => (
                        <div
                          key={track}
                          className="flex items-center gap-2 p-3 bg-muted rounded-lg"
                        >
                          <CodeIcon className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{track}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Eligibility & Requirements</CardTitle>
                    <CardDescription>
                      What you need to participate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(hackathon.requirements || []).map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Event Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          48 hours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {hackathon.location.venue}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {hackathon.location.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Registration Deadline</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(hackathon.registrationDeadline)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sponsors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sponsors</CardTitle>
                    <CardDescription>Supporting this event</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {["title", "gold", "silver", "bronze"].map((tier) => {
                        const tierSponsors = (hackathon.sponsors || []).filter(
                          (s) => s.tier === tier,
                        );
                        if (tierSponsors.length === 0) return null;

                        return (
                          <div key={tier}>
                            <h4 className="font-medium mb-2 capitalize">
                              {tier} Sponsors
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {tierSponsors.map((sponsor) => (
                                <div
                                  key={sponsor.name}
                                  className="p-2 border rounded-lg text-center"
                                >
                                  <img
                                    src={sponsor.logo}
                                    alt={sponsor.name}
                                    className="h-8 w-auto mx-auto mb-1"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/placeholder-logo.png";
                                    }}
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {sponsor.name}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Event Schedule</CardTitle>
                <CardDescription>
                  Detailed timeline of all hackathon activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {(hackathon.schedule || []).map((day) => (
                    <div key={day.day}>
                      <h3 className="text-lg font-semibold mb-4 text-blue-600">
                        {day.day}
                      </h3>
                      <div className="space-y-3">
                        {(day.events || []).map((event, index) => (
                          <div
                            key={index}
                            className="flex gap-4 p-3 rounded-lg hover:bg-muted"
                          >
                            <div className="w-16 text-sm font-medium text-muted-foreground flex-shrink-0">
                              {event.time}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prizes Tab */}
          <TabsContent value="prizes">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-2">
                    <TrophyIcon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-yellow-800">1st Place</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-2xl font-bold text-yellow-700 mb-2">
                    {hackathon.prizes.first}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mb-2">
                    <AwardIcon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-gray-800">2nd Place</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-2xl font-bold text-gray-700 mb-2">
                    {hackathon.prizes.second}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
                    <StarIcon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-orange-800">3rd Place</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-2xl font-bold text-orange-700 mb-2">
                    {hackathon.prizes.third}
                  </p>
                </CardContent>
              </Card>
            </div>

            {hackathon.prizes.special && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GiftIcon className="h-5 w-5" />
                    Special Prizes
                  </CardTitle>
                  <CardDescription>
                    Additional recognition and rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {(hackathon.prizes && hackathon.prizes.special
                      ? hackathon.prizes.special
                      : []
                    ).map((prize, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                      >
                        <AwardIcon className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">{prize}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Judges Tab */}
          <TabsContent value="judges">
            <Card>
              <CardHeader>
                <CardTitle>Meet the Judges</CardTitle>
                <CardDescription>
                  Industry experts who will evaluate your projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(hackathon.judges || []).map((judge, idx) => (
                    <div
                      key={(judge && (judge.name || judge.title)) || idx}
                      className="text-center"
                    >
                      <Avatar className="h-20 w-20 mx-auto mb-4">
                        <AvatarImage
                          src={judge?.image}
                          alt={judge?.name || ""}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                          {(
                            (judge && judge.name) ||
                            judge?.title ||
                            judge?.company ||
                            ""
                          )
                            .toString()
                            .split(" ")
                            .filter(Boolean)
                            .map((n: string) => n[0])
                            .join("") || "J"}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">
                        {judge?.name || "-"}
                      </h3>
                      <p className="text-sm text-blue-600 font-medium">
                        {judge?.title || "-"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {judge?.company || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hackathon Rules</CardTitle>
                <CardDescription>
                  Important guidelines for all participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(hackathon.rules || []).map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Guidelines</CardTitle>
                <CardDescription>How to submit your project</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(hackathon.submissionGuidelines || []).map(
                    (guideline, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{guideline}</span>
                      </li>
                    ),
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Resources & Tools</CardTitle>
                <CardDescription>
                  Everything you need to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {(hackathon.resources || []).map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {resource.type === "document" && (
                          <FileTextIcon className="h-5 w-5 text-blue-600" />
                        )}
                        {resource.type === "video" && (
                          <PlayCircleIcon className="h-5 w-5 text-blue-600" />
                        )}
                        {resource.type === "link" && (
                          <LinkIcon className="h-5 w-5 text-blue-600" />
                        )}
                        {resource.type === "tool" && (
                          <CodeIcon className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{resource.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {resource.description}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLinkIcon className="mr-2 h-3 w-3" />
                            Access Resource
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default HackathonDetail;
