import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const formatDisplay = (s?: string | null) => {
  if (!s && s !== "") return "";
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\n")
    .replace(/\t/g, "\t");
};

const LANGUAGE_TEMPLATES: Record<string, string> = {
  python: `def solution():\n    # Your code here\n    pass\n\nif __name__ == '__main__':\n    # read input and call solution\n    print(solution())`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    // Your code here\n    return 0;\n}`,
  java: `import java.util.*;\npublic class Solution{\n  public static void main(String[] args){\n    Scanner s = new Scanner(System.in);\n    // Your code\n    s.close();\n  }\n}`,
};

const BattlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const spectate = location.pathname.endsWith("/spectate");

  const [battle, setBattle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!id) {
          setError("Battle id missing");
          return;
        }
        const resp = await apiFetch(
          `/api/battles/${encodeURIComponent(String(id))}`,
        );
        const d = await resp.json().catch(() => null);
        if (resp.ok && d?.success && d?.data?.battle) {
          if (mounted) setBattle(d.data.battle);
        } else {
          setError(d?.message || "Unable to load battle");
        }
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleJoin = async () => {
    try {
      const resp = await apiFetch("/api/battles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        const bid = d.data?.battle?._id || id;
        navigate(`/battle/${bid}`);
      } else {
        setError(d?.message || "Join failed");
        alert(d?.message || "Join failed");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      alert("Network error while joining");
    }
  };

  const handleAccept = async () => {
    try {
      const resp = await apiFetch("/api/battles/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        window.location.reload();
      } else {
        setError(d?.message || "Accept failed");
        alert(d?.message || "Accept failed");
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const handleDecline = async () => {
    try {
      const resp = await apiFetch("/api/battles/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        window.location.reload();
      } else {
        setError(d?.message || "Decline failed");
        alert(d?.message || "Decline failed");
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>(LANGUAGE_TEMPLATES.python);
  const [input, setInput] = useState<string>("");
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);

  function batchLanguageOrDefault(lang: any) {
    if (!lang) return "python";
    const l = String(lang).toLowerCase();
    if (LANGUAGE_TEMPLATES[l]) return l;
    if (l.startsWith("py")) return "python";
    if (l.startsWith("java")) return "java";
    if (l.includes("cpp") || l === "c++") return "cpp";
    // Do not map to JavaScript — treat unknown as python
    // if (l.includes("script")) return "javascript";
    return "python";
  }

  useEffect(() => {
    setSelectedLanguage(batchLanguageOrDefault(battle?.language));
    setCode(
      LANGUAGE_TEMPLATES[batchLanguageOrDefault(battle?.language)] ||
        LANGUAGE_TEMPLATES.python,
    );

    // Prefill input from challenge examples if available
    try {
      if (
        battle &&
        battle.challenge &&
        Array.isArray(battle.challenge.examples) &&
        battle.challenge.examples.length > 0
      ) {
        setInput(String(battle.challenge.examples[0].input || ""));
      }
    } catch (e) {}

    // Attempt to fetch latest submission for this battle for current user
    (async () => {
      try {
        const bid = String(battle?._id || battle?.id || "");
        if (!bid) return;
        const resp = await apiFetch(
          `/api/battles/submission?battle_id=${encodeURIComponent(bid)}`,
        );
        const d = await resp.json().catch(() => null);
        if (resp.ok && d?.success && d?.data) {
          // Prefill code with latest submission if present
          if (d.data.code) setCode(d.data.code);
          // set latest submission result for display
          setSubmissionResult(d.data);
        }
      } catch (e) {}
    })();

    let timer: any = null;
    if (battle && battle.started_at && battle.duration_minutes) {
      const start = new Date(battle.started_at).getTime();
      const duration = Number(battle.duration_minutes || 30) * 60 * 1000;
      const end = start + duration;
      const update = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((end - now) / 1000));
        setTimeLeftSec(remaining);
      };
      update();
      timer = setInterval(update, 1000);
    } else {
      setTimeLeftSec(null);
    }
    return () => clearInterval(timer);
  }, [battle]);

  const handleRun = async () => {
    try {
      setRunOutput(null);
      const resp = await apiFetch("/api/challenges/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code,
          input: input || "",
        }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        setRunOutput(
          d.data?.output || d.data?.stdout || JSON.stringify(d.data),
        );
      } else {
        setRunOutput(d?.message || "Execution failed");
      }
    } catch (e: any) {
      setRunOutput(e?.message || String(e));
    }
  };

  const handleSubmitCode = async () => {
    try {
      setSubmitting(true);
      setSubmissionResult(null);
      const resp = await apiFetch("/api/battles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, language: selectedLanguage, code }),
      });
      const d = await resp.json().catch(() => null);
      if (resp.ok && d?.success) {
        setSubmissionResult(d.data || null);
      } else {
        setSubmissionResult({ error: d?.message || "Submission failed" });
      }
    } catch (e: any) {
      setSubmissionResult({ error: e?.message || String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="container py-8">Loading...</div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <div className="container py-8">Error: {error}</div>
      </Layout>
    );

  if (!battle)
    return (
      <Layout>
        <div className="container py-8">Battle not found</div>
      </Layout>
    );

  const currentUser = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user") || "null")?.username || null
      );
    } catch {
      return null;
    }
  })();

  const isParticipant =
    currentUser &&
    (battle.creator?.username === currentUser ||
      battle.opponent?.username === currentUser);

  return (
    <Layout>
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold">{battle.title}</div>
                <div className="text-sm text-muted-foreground">
                  {battle.challenge_title}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="font-semibold">{battle.duration_minutes}m</div>
              </div>
            </CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent>
            {battle.challenge && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  {battle.challenge.title}
                </h3>
                <ScrollArea className="h-[30vh] md:h-[40vh] mt-3 pr-2">
                  <div className="space-y-4 pr-4">
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {formatDisplay(battle.challenge.description)}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Examples</h4>
                      <div className="space-y-3">
                        {Array.isArray(battle.challenge.examples) &&
                        battle.challenge.examples.length > 0 ? (
                          battle.challenge.examples.map(
                            (ex: any, idx: number) => (
                              <div key={idx} className="p-3 bg-muted rounded">
                                <div className="text-sm font-medium">
                                  Input:
                                </div>
                                <pre className="text-xs mt-1 whitespace-pre-wrap">
                                  {formatDisplay(ex.input)}
                                </pre>
                                <div className="text-sm font-medium mt-2">
                                  Output:
                                </div>
                                <pre className="text-xs mt-1 whitespace-pre-wrap">
                                  {formatDisplay(ex.output)}
                                </pre>
                              </div>
                            ),
                          )
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No examples provided
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex items-center gap-6 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Creator</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={battle.creator?.avatar || "/placeholder-avatar.jpg"}
                    />
                    <AvatarFallback>
                      {(battle.creator?.username || "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {battle.creator?.username === currentUser
                        ? "You"
                        : battle.creator?.username}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {battle.creator?.rating || "--"} rating
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Opponent</p>
                {battle.opponent ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {(battle.opponent?.username || "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {battle.opponent?.username === currentUser
                          ? "You"
                          : battle.opponent?.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {battle.opponent?.rating || "--"} rating
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {battle.status === "invited"
                      ? `Invited: ${battle.invited || ""}`
                      : "No opponent yet"}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              {!spectate && battle.status === "waiting" && (
                <Button onClick={handleJoin}>Join Battle</Button>
              )}

              {!spectate &&
                battle.status === "invited" &&
                currentUser &&
                String(battle.invited) === currentUser && (
                  <>
                    <Button onClick={handleAccept}>Accept</Button>
                    <Button variant="outline" onClick={handleDecline}>
                      Decline
                    </Button>
                  </>
                )}

              <Button variant="secondary" onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>

            {battle.status === "in_progress" && isParticipant && (
              <div className="space-y-4 mt-6">
                <div>
                  <Label>Language</Label>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(v) => setSelectedLanguage(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded overflow-hidden shadow-lg">
                  <Editor
                    height="48vh"
                    language={
                      selectedLanguage === "cpp" ? "cpp" : selectedLanguage
                    }
                    value={code}
                    onChange={(v) => setCode(v || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true },
                      fontSize: 14,
                      wordWrap: "on",
                      automaticLayout: true,
                      smoothScrolling: true,
                      fontLigatures: true,
                      lineNumbers: "on",
                      glyphMargin: true,
                      quickSuggestions: true,
                      formatOnPaste: true,
                    }}
                  />
                </div>

                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">
                    Test Input
                  </label>
                  <Textarea
                    placeholder="Enter test input..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <Button onClick={handleRun} disabled={!code.trim()}>
                    Run
                  </Button>
                  <Button
                    onClick={handleSubmitCode}
                    disabled={submitting || !code.trim()}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                  <div className="ml-auto text-right">
                    {timeLeftSec !== null && (
                      <div className="text-sm text-muted-foreground">
                        Time left:{" "}
                        <span className="font-mono">
                          {Math.floor((timeLeftSec || 0) / 60)}:
                          {String((timeLeftSec || 0) % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-semibold text-brand-600">
                      Prize: {battle.prize_points || 0} pts
                    </div>
                  </div>
                </div>

                {runOutput && (
                  <Card>
                    <CardContent>
                      <pre className="whitespace-pre-wrap">{runOutput}</pre>
                    </CardContent>
                  </Card>
                )}

                {submissionResult && (
                  <div className="space-y-4">
                    {submissionResult.error && (
                      <Card>
                        <CardContent>
                          <div className="text-red-600">
                            {submissionResult.error}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!submissionResult.error && (
                      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                        <CardContent>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="font-semibold text-lg">
                              {String(
                                submissionResult.status || "Result",
                              ).toUpperCase()}
                            </div>
                            <div className="text-sm text-white/80">
                              Score: {submissionResult.points} | Passed:{" "}
                              {submissionResult.passed}/{submissionResult.total}
                            </div>
                          </div>

                          {Array.isArray(submissionResult.test_results) && (
                            <div className="space-y-2 max-h-60 overflow-auto">
                              {submissionResult.test_results.map(
                                (t: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-2 border rounded bg-white/5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-medium">
                                        Test Case {idx + 1}
                                      </div>
                                      <div
                                        className={
                                          t.passed
                                            ? "text-green-400"
                                            : "text-red-400"
                                        }
                                      >
                                        {t.passed ? "PASSED" : "FAILED"}
                                      </div>
                                    </div>
                                    {!t.passed && (
                                      <div className="mt-2 text-xs">
                                        <div>
                                          <strong>Expected:</strong>
                                          <pre className="bg-muted p-1 rounded mt-1 whitespace-pre-wrap">
                                            {String(
                                              t.output || t.expected || "",
                                            )}
                                          </pre>
                                        </div>
                                        <div className="mt-1">
                                          <strong>Got:</strong>
                                          <pre className="bg-muted p-1 rounded mt-1 whitespace-pre-wrap">
                                            {String(
                                              t.output ||
                                                t.actual ||
                                                t.stdout ||
                                                "",
                                            )}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {battle.status === "completed" && (
              <div className="mt-4">
                <div className="p-6 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-xl">
                  <h2 className="text-2xl font-bold">
                    {battle.winner
                      ? `Champion: ${battle.winner}`
                      : "Battle Ended - Draw"}
                  </h2>
                  <p className="mt-2">
                    Prize distributed: {battle.prize_points || 0} pts
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BattlePage;
