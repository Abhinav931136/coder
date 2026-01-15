import { Link } from "react-router-dom";
import {
  TwitterIcon,
  InstagramIcon,
  LinkedinIcon,
  MailIcon,
} from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background/80">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <img
                src="https://interndesire.com/favicon.png"
                alt="InternDesire"
                className="h-10 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="font-bold text-xl">InternDesire</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Level up with daily challenges, battles, and hackathons.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/challenges" className="hover:text-foreground">
                  Challenges
                </Link>
              </li>
              <li>
                <Link to="/battles" className="hover:text-foreground">
                  Battles
                </Link>
              </li>
              <li>
                <Link to="/hackathons" className="hover:text-foreground">
                  Hackathons
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-foreground">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Connect</h3>
            <div className="flex items-center gap-3 text-muted-foreground">
              <a
                href="https://x.com/interndesire"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className="hover:text-foreground"
              >
                <TwitterIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/interndesire/"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="hover:text-foreground"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/interndesire"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="hover:text-foreground"
              >
                <LinkedinIcon className="h-5 w-5" />
              </a>
              <a
                href="mailto:support@interndesire.com"
                aria-label="Email"
                className="hover:text-foreground"
              >
                <MailIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground">
          <p>© {year} InternDesire. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
