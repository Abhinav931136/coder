import { useState, useEffect } from "react";
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
import {
  SearchIcon,
  FilterIcon,
  CodeIcon,
  TrophyIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  points: number;
  publish_date: string;
  is_daily: boolean;
  solved_count: number;
}

interface DailyChallenge extends Challenge {}

const Challenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDailyChallenge();
    fetchChallenges();
  }, [currentPage, difficultyFilter, searchTerm]);

  const fetchDailyChallenge = async () => {
    try {
      setDailyLoading(true);
      const response = await apiFetch("/api/challenges/daily", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        try {
          const txt = await response.text();
          data = { success: false, message: txt };
        } catch (ee) {
          data = { success: false, message: String(e) };
        }
      }

      if (data && data.success) {
        setDailyChallenge(data.data.challenge);
      }
    } catch (error) {
      console.error("Failed to fetch daily challenge:", error);
    } finally {
      setDailyLoading(false);
    }
  };

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "12",
      });

      if (difficultyFilter && difficultyFilter !== "all") {
        params.append("difficulty", difficultyFilter);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await apiFetch(`/api/challenges/list?${params}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        try {
          const txt = await response.text();
          data = { success: false, message: txt };
        } catch (ee) {
          data = { success: false, message: String(e) };
        }
      }

      if (data && data.success) {
        setChallenges(data.data.items);
        setTotalPages(data.data.pagination.total_pages);
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getChallengeId = (c: any) => (c as any)?._id ?? (c as any)?.id;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchChallenges();
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            Coding Challenges
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sharpen your programming skills with our collection of challenges.
            Practice daily and track your progress.
          </p>
        </div>

        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="daily">Daily Challenge</TabsTrigger>
            <TabsTrigger value="all">All Challenges</TabsTrigger>
          </TabsList>

          {/* Daily Challenge Tab */}
          <TabsContent value="daily">
            <div className="max-w-4xl mx-auto">
              {dailyLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading today's challenge...
                    </p>
                  </CardContent>
                </Card>
              ) : dailyChallenge ? (
                <Card className="bg-card border text-foreground">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-brand-600 text-white">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        Today's Challenge
                      </Badge>
                      <Badge
                        className={getDifficultyColor(
                          dailyChallenge.difficulty,
                        )}
                      >
                        {dailyChallenge.difficulty.charAt(0).toUpperCase() +
                          dailyChallenge.difficulty.slice(1)}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl text-foreground">
                      {dailyChallenge.title}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {dailyChallenge.description.substring(0, 200)}...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <TrophyIcon className="h-4 w-4 mr-1" />
                          {dailyChallenge.points} points
                        </div>
                        <div className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          {dailyChallenge.solved_count} solved
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {dailyChallenge.tags.slice(0, 3).map((tag, i) => (
                          <Badge
                            key={`${tag}-${i}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="lg" asChild className="w-full">
                      <Link to={`/challenge/${getChallengeId(dailyChallenge)}`}>
                        <CodeIcon className="mr-2 h-5 w-5" />
                        Start Solving
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Daily Challenge Today
                    </h3>
                    <p className="text-muted-foreground">
                      Check back tomorrow for a new challenge!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* All Challenges Tab */}
          <TabsContent value="all">
            <div className="space-y-6">
              {/* Search and Filters */}
              <Card>
                <CardContent className="p-6">
                  <form
                    onSubmit={handleSearch}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex-1 relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search challenges..."
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
                    <Button type="submit">Search</Button>
                  </form>
                </CardContent>
              </Card>

              {/* Challenges Grid */}
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-5/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : challenges.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.map((challenge) => (
                      <Card
                        key={getChallengeId(challenge)}
                        className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              className={getDifficultyColor(
                                challenge.difficulty,
                              )}
                            >
                              {challenge.difficulty.charAt(0).toUpperCase() +
                                challenge.difficulty.slice(1)}
                            </Badge>
                            {challenge.is_daily && (
                              <Badge variant="outline" className="text-xs">
                                Daily
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg text-foreground group-hover:underline transition-colors">
                            {challenge.title}
                          </CardTitle>
                          <CardDescription>
                            {challenge.description.substring(0, 120)}...
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <TrophyIcon className="h-4 w-4 mr-1" />
                              {challenge.points} pts
                            </div>
                            <div className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              {challenge.solved_count} solved
                            </div>
                            <div className="text-xs">
                              {formatDate(challenge.publish_date)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {challenge.tags.slice(0, 2).map((tag, i) => (
                              <Badge
                                key={`${tag}-${i}`}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {challenge.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{challenge.tags.length - 2}
                              </Badge>
                            )}
                          </div>

                          <Button className="w-full" asChild>
                            <Link
                              to={`/challenge/${getChallengeId(challenge)}`}
                            >
                              <CodeIcon className="mr-2 h-4 w-4" />
                              Solve Challenge
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              onClick={() => setCurrentPage(page)}
                              className="w-10"
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Challenges Found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search criteria or check back later for
                      new challenges.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Challenges;
