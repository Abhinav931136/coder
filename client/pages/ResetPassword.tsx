import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const token = (params.token as string) || searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return setError("Missing reset token");
    let mounted = true;
    const validate = async () => {
      setValidating(true);
      try {
        const resp = await apiFetch(
          `/api/auth/validate-reset?token=${encodeURIComponent(token)}`,
        );
        const d = await resp.json().catch(() => null);
        if (!resp.ok || !d?.valid) {
          if (mounted) setError(d?.message || "Invalid or expired token");
        } else {
          if (mounted) setMaskedEmail(d?.email || null);
        }
      } catch (e) {
        if (mounted) setError("Network error while validating token");
      } finally {
        if (mounted) setValidating(false);
      }
    };
    validate();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!token) return setError("Missing token");
    if (password.length < 8)
      return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const resp = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await resp.json().catch(() => null);
      if (!resp.ok) {
        setError(d?.message || `Request failed (${resp.status})`);
      } else {
        setMessage(d?.message || "Password reset successful");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                Set a new password for your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validating ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    Validating reset link...
                  </p>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {message && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertDescription className="text-green-800">
                        {message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-center mb-2">
                    <p className="text-sm text-muted-foreground">
                      Resetting password for
                    </p>
                    <p className="font-medium">
                      {maskedEmail || "your account"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !password || !confirm}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
