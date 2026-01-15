import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GoogleAuth from "@/components/GoogleAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EyeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  LoaderIcon,
} from "lucide-react";

const INSTITUTIONS: Record<string, string> = {
  "1": "Stanford University",
  "2": "MIT",
  "3": "IIT Delhi",
  "4": "Uttaranchal University",
  "5": "Dev Bhoomi Uttarakhand University",
  "6": "DIT University",
};

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    institution_id: "",
    institution_name: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user is already logged in
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user starts typing
    if (error) setError(null);
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isNumericInstitution =
        /^\d+$/.test(formData.institution_id) &&
        formData.institution_id !== "other";

      // Always send trimmed, required fields
      const requestData: any = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
      };

      // Handle institution_id and institution_name
      if (isNumericInstitution) {
        requestData.institution_id = parseInt(formData.institution_id, 10);
      }
      if (formData.institution_name) {
        requestData.institution_name = formData.institution_name.trim();
      }

      const response = await (
        await import("@/lib/api")
      ).apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (_) {}

      if (!response.ok) {
        setError(
          data?.message ||
            data?.error ||
            `Registration failed (status ${response.status})`,
        );
        if (data?.errors) {
          const fieldErrors: Record<string, string> = { ...data.errors };
          const missing = (data.errors as any).missing_fields;
          if (Array.isArray(missing)) {
            missing.forEach((f: string) => {
              fieldErrors[f] = "This field is required";
            });
          }
          setErrors(fieldErrors);
        }
        return;
      }

      if (data?.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        navigate("/dashboard");
      } else {
        if (data?.errors) {
          const fieldErrors: Record<string, string> = { ...data.errors };
          const missing = (data.errors as any).missing_fields;
          if (Array.isArray(missing)) {
            missing.forEach((f: string) => {
              fieldErrors[f] = "This field is required";
            });
          }
          setErrors(fieldErrors);
        } else {
          setError(data?.message || "Registration failed");
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return strength;
  };

  const getPasswordStrengthLabel = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { label: "Weak", color: "bg-red-500" };
      case 2:
        return { label: "Fair", color: "bg-orange-500" };
      case 3:
        return { label: "Good", color: "bg-yellow-500" };
      case 4:
      case 5:
        return { label: "Strong", color: "bg-green-500" };
      default:
        return { label: "Weak", color: "bg-red-500" };
    }
  };

  const usingOtherInstitution = formData.institution_id === "other";

  return (
    <Layout>
      <div className="container py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Join InternDesire</CardTitle>
              <CardDescription>
                Create your account and start your coding journey today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <GoogleAuth />
                <div className="text-center text-sm text-muted-foreground">
                  or continue with email
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangleIcon className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        type="text"
                        placeholder="John"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                      {errors.first_name && (
                        <p className="text-xs text-red-600">
                          {errors.first_name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        type="text"
                        placeholder="Doe"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                      {errors.last_name && (
                        <p className="text-xs text-red-600">
                          {errors.last_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="johndoe123"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                    {errors.username && (
                      <p className="text-xs text-red-600">{errors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="institution_id">
                      Institution (Optional)
                    </Label>
                    <Select
                      value={formData.institution_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          institution_id: value,
                          institution_name:
                            value === "other"
                              ? prev.institution_name
                              : INSTITUTIONS[value] || "",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your institution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Stanford University</SelectItem>
                        <SelectItem value="2">MIT</SelectItem>
                        <SelectItem value="3">IIT Delhi</SelectItem>
                        <SelectItem value="4">
                          Uttaranchal University
                        </SelectItem>
                        <SelectItem value="5">
                          Dev Bhoomi Uttarakhand University
                        </SelectItem>
                        <SelectItem value="6">
                          DIT University
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    {usingOtherInstitution && (
                      <div className="pt-2">
                        <Label htmlFor="institution_name">
                          Your Institution Name
                        </Label>
                        <Input
                          id="institution_name"
                          name="institution_name"
                          type="text"
                          placeholder="Enter your institution"
                          value={formData.institution_name}
                          onChange={handleInputChange}
                          disabled={loading}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Password Strength:</span>
                          <span
                            className={`font-medium ${getPasswordStrengthLabel(getPasswordStrength()).color.replace("bg-", "text-")}`}
                          >
                            {
                              getPasswordStrengthLabel(getPasswordStrength())
                                .label
                            }
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getPasswordStrengthLabel(getPasswordStrength()).color}`}
                            style={{
                              width: `${(getPasswordStrength() / 5) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {errors.password && (
                      <p className="text-xs text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          agreeToTerms: checked as boolean,
                        }))
                      }
                    />
                    <Label
                      htmlFor="agreeToTerms"
                      className="text-sm leading-relaxed"
                    >
                      I agree to the{" "}
                      <Link
                        to="/terms"
                        className="text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/privacy"
                        className="text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  {errors.agreeToTerms && (
                    <p className="text-xs text-red-600">
                      {errors.agreeToTerms}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !formData.agreeToTerms}
                  >
                    {loading ? (
                      <>
                        <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-brand-600 hover:text-brand-700 hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
