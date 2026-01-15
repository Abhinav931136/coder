import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src='${src}']`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load script: " + src));
    document.head.appendChild(s);
  });

const GoogleAuth: React.FC<{ label?: string }> = ({
  label = "Continue with Google",
}) => {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [rendered, setRendered] = useState(false);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || "";

  useEffect(() => {
    let mounted = true;
    if (!clientId) return;
    const init = async () => {
      try {
        await loadScript("https://accounts.google.com/gsi/client");
        if (!mounted) return;
        const g: any = (window as any).google;
        if (!g) return;
        g.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            if (!resp || !resp.credential) return;
            setLoading(true);
            try {
              const r = await apiFetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: resp.credential }),
              });
              const d = await r.json().catch(() => null);
              if (r.ok && d?.success) {
                try {
                  localStorage.setItem("token", d.data.token);
                  localStorage.setItem("user", JSON.stringify(d.data.user));
                  window.location.href = "/dashboard";
                } catch {}
              } else {
                alert(d?.message || "Google sign-in failed");
              }
            } catch (e) {
              console.error(e);
              alert("Network error during Google sign-in");
            } finally {
              setLoading(false);
            }
          },
        });

        // Try to render the official Google button into our container. This avoids
        // triggering FedCM-based One Tap flows (which can fail inside iframes without
        // the 'identity-credentials-get' feature). If renderButton is not available
        // fall back to our custom icon button which will attempt prompt() in a safe try/catch.
        try {
          if (
            btnRef.current &&
            typeof g.accounts.id.renderButton === "function"
          ) {
            // Clear container then render
            btnRef.current.innerHTML = "";
            try {
              g.accounts.id.renderButton(btnRef.current, {
                theme: "outline",
                size: "large",
                type: "standard",
              });
              setRendered(true);
            } catch (err) {
              console.debug("renderButton threw", err);
            }
          }
        } catch (e) {
          console.debug(
            "Google renderButton failed, will use fallback button",
            e,
          );
        }
      } catch (e) {
        console.debug("Google GIS not available", e);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [clientId]);

  const handleClick = () => {
    const g: any = (window as any).google;
    if (g && g.accounts && typeof g.accounts.id.prompt === "function") {
      try {
        // trigger the One Tap prompt which will call our callback when a credential is available
        g.accounts.id.prompt();
      } catch (err: any) {
        console.debug("Google prompt() blocked or not allowed", err);
        alert(
          "Google Sign-In prompt is not allowed in this context. Please use the rendered Google button or open the app in a top-level window.",
        );
      }
    } else {
      alert(
        "Google Sign-In not available. Please provide VITE_GOOGLE_CLIENT_ID in env.",
      );
    }
  };

  const iconButton = (props: { onClick?: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={label}
      disabled={props.disabled}
      title={label}
      className={`inline-flex items-center justify-center rounded-md border px-3 py-2 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 ${
        props.disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow"
      }`}
      style={{ width: 44, height: 44 }}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 533.5 544.3"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          fill="#4285f4"
          d="M533.5 278.4c0-18.5-1.6-36.3-4.6-53.6H272v101.4h147.1c-6.3 34.1-25.1 62.9-53.6 82v68.1h86.5c50.5-46.6 80.5-115 80.5-197.9z"
        />
        <path
          fill="#34a853"
          d="M272 544.3c72.6 0 133.7-24.1 178.3-65.4l-86.5-68.1c-23.8 16-54.4 25.6-91.8 25.6-70.5 0-130.2-47.6-151.6-111.6H34.7v69.9C79.3 492.6 168.6 544.3 272 544.3z"
        />
        <path
          fill="#fbbc04"
          d="M120.4 325.3c-10.6-31.6-10.6-65.6 0-97.2V158.2H34.7C12.3 198.6 0 237.8 0 278.1s12.3 79.5 34.7 119.9l85.7-72.7z"
        />
        <path
          fill="#ea4335"
          d="M272 109.7c38.6 0 73.3 13.3 100.7 39.5l75.4-75.4C405.6 28.1 344.5 0 272 0 168.6 0 79.3 51.7 34.7 141.8l85.7 69.9C141.8 157.3 201.5 109.7 272 109.7z"
        />
      </svg>
    </button>
  );

  if (!clientId) {
    return (
      <div className="flex justify-center">
        {iconButton({
          onClick: () =>
            alert(
              "Google Client ID not configured. Please provide VITE_GOOGLE_CLIENT_ID.",
            ),
          disabled: true,
        })}
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {/* If the official Google button was rendered into btnRef, show that. Otherwise show fallback icon button */}
      <div ref={btnRef} style={{ display: rendered ? "block" : "none" }} />
      {!rendered && iconButton({ onClick: handleClick })}
    </div>
  );
};

export default GoogleAuth;
