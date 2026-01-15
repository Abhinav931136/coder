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
import {
  CodeIcon,
  TrophyIcon,
  UsersIcon,
  ZapIcon,
  BookOpenIcon,
  TargetIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const features = [
    {
      icon: CodeIcon,
      title: "Daily Challenges",
      description:
        "Sharpen your skills with fresh programming challenges every day",
      link: "/challenges",
    },
    {
      icon: ZapIcon,
      title: "1v1 Battles",
      description:
        "Compete in real-time coding battles against other developers",
      link: "/battles",
    },
    {
      icon: UsersIcon,
      title: "Hackathons",
      description: "Join institutional hackathons with team collaboration",
      link: "/hackathons",
    },
    {
      icon: TrophyIcon,
      title: "Leaderboards",
      description: "Track your progress and compete for the top spot",
      link: "/leaderboard",
    },
  ];

  const benefits = [
    "Automated code evaluation and instant feedback",
    "Secure execution environment for testing solutions",
    "Certificate generation for achievements",
    "Multi-language programming support",
    "Real-time analytics and progress tracking",
    "Institution-wide event management",
  ];

  const stats = [
    { value: "10K+", label: "Active Developers" },
    { value: "500+", label: "Daily Challenges" },
    { value: "50+", label: "Institutions" },
    { value: "95%", label: "Success Rate" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              <StarIcon className="w-3 h-3 mr-1" />
              #1 Coding Challenge Platform
            </Badge>

            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-brand-600 via-code-600 to-brand-800 bg-clip-text text-transparent">
              Master Coding Through
              <span className="block">Challenge & Competition</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers improving their skills through daily
              challenges, competitive battles, and institutional hackathons on
              InternDesire.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/dashboard">
                  Start Coding Today
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/challenges">View Challenges</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-brand-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From daily practice to competitive programming, we provide all the
              tools to advance your coding journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
                    <feature.icon className="h-6 w-6 text-brand-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    variant="ghost"
                    asChild
                    className="group-hover:bg-brand-50"
                  >
                    <Link to={feature.link}>
                      Learn More
                      <ArrowRightIcon className="ml-2 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                Why Choose InternDesire?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built by developers, for developers. Our platform combines
                cutting-edge technology with proven educational methodologies to
                accelerate your growth.
              </p>

              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-brand-500 to-brand-600 text-white">
                  <CardHeader>
                    <BookOpenIcon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-white">Learn</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-brand-100">
                      Master new concepts through structured challenges
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-code-500 to-code-600 text-white mt-8">
                  <CardHeader>
                    <TargetIcon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-white">Practice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-code-100">
                      Solve real-world programming problems
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white -mt-4">
                  <CardHeader>
                    <ZapIcon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-white">Compete</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-green-100">
                      Battle other developers in real-time
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white mt-4">
                  <CardHeader>
                    <TrophyIcon className="h-8 w-8 mb-2" />
                    <CardTitle className="text-white">Achieve</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-100">
                      Earn certificates and recognition
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-gradient-to-r from-brand-600 to-code-600 text-white">
            <CardContent className="text-center py-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
                Join thousands of developers who are already improving their
                skills and advancing their careers with InternDesire.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/dashboard">Get Started Free</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white dark:border-white dark:text-white text-brand-600 hover:bg-white hover:text-brand-600 dark:hover:bg-white dark:hover:text-brand-600"
                  asChild
                >
                  <Link to="/challenges">Browse Challenges</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
