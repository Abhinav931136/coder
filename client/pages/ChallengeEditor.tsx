import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  PlayIcon,
  SendIcon,
  ClockIcon,
  MemoryStickIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  TrophyIcon,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { apiFetch } from "@/lib/api";

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  input_format: string;
  output_format: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  supported_languages: string[];
  points: number;
  solved_count: number;
}

interface TestResult {
  test_case: number;
  input: string;
  expected_output: string;
  actual_output: string;
  status: "passed" | "failed";
  execution_time: number;
  error?: string;
}

interface SubmissionResult {
  submission_id: number | string;
  status: string;
  score: number;
  execution_time: number;
  memory_used: number;
  test_results: TestResult[];
  error_message?: string;
  alreadyAccepted?: boolean;
}

const LANGUAGE_TEMPLATES = {
  python: `def solution():
    # Your code here
    pass

# Read input
# Write your solution
print(solution())`,

  java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Your code here
        scanner.close();
    }
}`,

  cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,

  go: `package main

import (
    "fmt"
)

func main() {
    // Your code here
}`,
};

const ChallengeEditor = () => {
  const formatDisplay = (s?: string | null) => {
    if (!s && s !== "") return "";
    return String(s || "")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  };
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [input, setInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState("problem");

  useEffect(() => {
    fetchChallenge();
  }, [id]);

  useEffect(() => {
    if (
      selectedLanguage &&
      LANGUAGE_TEMPLATES[selectedLanguage as keyof typeof LANGUAGE_TEMPLATES]
    ) {
      setCode(
        LANGUAGE_TEMPLATES[selectedLanguage as keyof typeof LANGUAGE_TEMPLATES],
      );
    }
  }, [selectedLanguage]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/challenges/get?id=${id}`);
      const data = await response.json();

      if (data.success) {
        setChallenge(data.data.challenge);
        if (data.data.challenge.supported_languages.length > 0) {
          // prefer first supported language that is not javascript
          const langs: string[] = data.data.challenge.supported_languages || [];
          const prefer = langs.find(
            (l: string) => String(l).toLowerCase() !== "javascript",
          );
          setSelectedLanguage(prefer || langs[0]);
        }
        // Set first example as default input
        if (data.data.challenge.examples.length > 0) {
          setInput(data.data.challenge.examples[0].input);
        }

        // Fetch latest submission for this user & challenge (if logged in)
        const t = localStorage.getItem("token");
        if (t) {
          apiFetch(
            `/api/challenges/submission?challenge_id=${data.data.challenge._id || data.data.challenge.id || id}`,
          )
            .then((r: any) => r.json())
            .then((d: any) => {
              if (d?.success && d?.data) {
                setSubmissionResult(d.data);
                if (d.data.code) setCode(d.data.code);
              }
            })
            .catch(() => {});
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to load challenge");
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    try {
      setIsRunning(true);
      setOutput("");

      const response = await apiFetch("/api/challenges/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          code: code,
          input: input,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOutput(data.data.output);
        if (data.data.error) {
          setOutput((prev) => prev + "\n\nError:\n" + data.data.error);
        }
      } else {
        setOutput("Error: " + data.message);
      }
    } catch (err) {
      setOutput("Error: Failed to run code");
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!challenge) return;

    try {
      setIsSubmitting(true);
      setSubmissionResult(null);

      const response = await apiFetch("/api/challenges/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id:
            (challenge as any)._id?.toString?.() ||
            (challenge as any).id?.toString?.() ||
            String(id),
          language: selectedLanguage,
          code: code,
        }),
      });

      const data = await response.json().catch(() => null);

      if (data?.success) {
        setSubmissionResult(data.data);
        setActiveTab("results");
        // Refresh profile to update points/stats
        const t = localStorage.getItem("token");
        if (t) {
          apiFetch("/api/auth/profile")
            .then((r: any) => r.json())
            .then((d: any) => {
              if (d?.success && d?.data?.user) {
                localStorage.setItem("user", JSON.stringify(d.data.user));
                try {
                  window.dispatchEvent(new Event("user:update"));
                } catch (e) {}
              }
            })
            .catch(() => {});
        }
      } else {
        setError(
          data?.message || `Failed to submit code (status ${response.status})`,
        );
      }
    } catch (err) {
      setError("Failed to submit code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "wrong_answer":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "compilation_error":
      case "runtime_error":
        return <AlertTriangleIcon className="h-5 w-5 text-orange-500" />;
      case "time_limit_exceeded":
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case "memory_limit_exceeded":
        return <MemoryStickIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <InfoIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading challenge...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !challenge) {
    return (
      <Layout>
        <div className="container py-8">
          <Alert className="max-w-md mx-auto">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              {error || "Challenge not found"}
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Check if user is authenticated
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Panel - Problem Description */}
          <div className="flex flex-col min-h-0">
            <Card className="flex-1 min-h-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{challenge.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={getDifficultyColor(challenge.difficulty)}
                      >
                        {challenge.difficulty.charAt(0).toUpperCase() +
                          challenge.difficulty.slice(1)}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <TrophyIcon className="h-4 w-4 mr-1" />
                        {challenge.points} points
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {challenge.solved_count} solved
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {challenge.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="problem">Problem</TabsTrigger>
                    <TabsTrigger value="examples">Examples</TabsTrigger>
                    <TabsTrigger value="results">Results</TabsTrigger>
                  </TabsList>

                  <TabsContent value="problem" className="mt-4">
                    <ScrollArea className="h-[60vh] md:h-[70vh] pr-2">
                      <div className="space-y-4 pr-4">
                        <div>
                          <h4 className="font-semibold mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {challenge.description}
                          </p>
                        </div>

                        <Separator />

                        <div>
                          <h4 className="font-semibold mb-2">Input Format</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {challenge.input_format}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Output Format</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {challenge.output_format}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Constraints</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {challenge.constraints}
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="examples" className="mt-4">
                    <ScrollArea className="h-[60vh] md:h-[70vh] pr-2">
                      <div className="space-y-4 pr-4">
                        {challenge.examples.map((example, index) => (
                          <Card key={index} className="p-4">
                            <div className="space-y-2">
                              <h5 className="font-semibold">
                                Example {index + 1}
                              </h5>
                              <div>
                                <p className="text-sm font-medium">Input:</p>
                                <pre className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-words">
                                  {formatDisplay(example.input)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Output:</p>
                                <pre className="text-sm bg-muted p-2 rounded mt-1 whitespace-pre-wrap break-words">
                                  {formatDisplay(example.output)}
                                </pre>
                              </div>
                              {example.explanation && (
                                <div>
                                  <p className="text-sm font-medium">
                                    Explanation:
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {example.explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="results" className="mt-4">
                    <ScrollArea className="h-[60vh] md:h-[70vh] pr-2">
                      {submissionResult ? (
                        <div className="space-y-4 pr-4 min-w-full">
                          <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                              {getStatusIcon(submissionResult.status)}
                              <div>
                                <h4 className="font-semibold capitalize">
                                  {submissionResult.status.replace("_", " ")}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Score: {submissionResult.score} /{" "}
                                  {challenge.points}
                                </p>
                                {submissionResult.alreadyAccepted && (
                                  <p className="text-xs text-green-700 mt-1">
                                    Already solved earlier. No extra points
                                    awarded.
                                  </p>
                                )}
                              </div>
                            </div>

                            {submissionResult.status === "accepted" && (
                              <Alert className="bg-green-50 border-green-200">
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                  Congratulations! Your solution passed all test
                                  cases.
                                </AlertDescription>
                              </Alert>
                            )}

                            {submissionResult.error_message && (
                              <Alert className="bg-red-50 border-red-200 mt-4">
                                <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                  {submissionResult.error_message}
                                </AlertDescription>
                              </Alert>
                            )}
                          </Card>

                          {submissionResult.test_results && (
                            <ScrollArea className="h-[40vh] pr-2">
                              <h5 className="font-semibold mb-3">
                                Test Results
                              </h5>
                              <div className="space-y-2">
                                {submissionResult.test_results.map(
                                  (result, index) => (
                                    <Card key={index} className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">
                                          Test Case {result.test_case}
                                        </span>
                                        <Badge
                                          className={
                                            result.status === "passed"
                                              ? "bg-green-100 text-green-800"
                                              : "bg-red-100 text-red-800"
                                          }
                                        >
                                          {result.status}
                                        </Badge>
                                      </div>
                                      {result.status === "failed" && (
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <span className="font-medium">
                                              Expected:
                                            </span>
                                            <pre className="bg-muted p-1 rounded text-xs mt-1 whitespace-pre-wrap break-words">
                                              {formatDisplay(
                                                result.expected_output,
                                              )}
                                            </pre>
                                          </div>
                                          <div>
                                            <span className="font-medium">
                                              Got:
                                            </span>
                                            <pre className="bg-muted p-1 rounded text-xs mt-1 whitespace-pre-wrap break-words">
                                              {formatDisplay(
                                                result.actual_output,
                                              )}
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                    </Card>
                                  ),
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          Submit your code to see results here
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Code Editor */}
          <div className="flex flex-col min-h-0">
            <Card className="flex-1 min-h-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Code Editor</CardTitle>
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {challenge.supported_languages
                        .filter(
                          (lang) => String(lang).toLowerCase() !== "javascript",
                        )
                        .map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="h-[80vh] pr-2">
                  <div className="flex-1 border rounded-md overflow-hidden">
                    <Editor
                      height="45vh"
                      language={
                        selectedLanguage === "cpp" ? "cpp" : selectedLanguage
                      }
                      value={code}
                      onChange={(value) => setCode(value || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
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

                    <div className="flex gap-2">
                      <Button
                        onClick={runCode}
                        disabled={isRunning || !code.trim()}
                        variant="outline"
                        className="flex-1"
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        {isRunning ? "Running..." : "Run Code"}
                      </Button>
                      <Button
                        onClick={submitCode}
                        disabled={isSubmitting || !code.trim()}
                        className="flex-1"
                      >
                        <SendIcon className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>

                    {output && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Output
                        </label>
                        <pre className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap break-words">
                          {formatDisplay(output)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChallengeEditor;
