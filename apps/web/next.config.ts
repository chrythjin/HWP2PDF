import type { NextConfig } from "next";

/**
 * Build CSP directives using the runtime API URL when available so the
 * browser allows fetch() calls to the configured conversion backend.
 * NEXT_PUBLIC_API_BASE_URL is inlined at build time by Next.js, so the
 * CSP header must be generated inside headers() (per-request) to pick it up.
 */
function buildCsp(apiBaseUrl: string | undefined): string[] {
  // Normalize the API origin (strip trailing slash, keep origin only).
  const apiOrigin = apiBaseUrl
    ? (() => {
        try {
          const u = new URL(apiBaseUrl);
          return u.origin;
        } catch {
          return apiBaseUrl.replace(/\/$/, "");
        }
      })()
    : "";

  const connectSources = [
    "'self'",
    "https://www.googleapis.com",
    "https://firestore.googleapis.com",
    "https://storage.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    // AdSense telemetry / SODAR config endpoint
    "https://ep1.adtrafficquality.google",
  ];
  if (apiOrigin) connectSources.push(apiOrigin);

  return [
    "default-src 'self'",
    // Scripts: self + inline (Next.js hydration) + AdSense SDK + Firebase App
    "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.gstatic.com https://www.googleapis.com",
    // Styles: self + inline (Next.js styled-jsx) + Google Fonts CSS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts: self + Google Fonts file CDN
    "font-src 'self' https://fonts.gstatic.com",
    // Images: self + data: (inline) + blob: (object URLs) + AdSense ad images + GCS
    "img-src 'self' data: blob: https: http:",
    // Connect: self + Firebase Auth + Firestore + GCS upload + AdSense SODAR + API
    `connect-src ${connectSources.join(" ")}`,
    // Frames: AdSense renders ads in iframes
    "frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com",
    // Object/embed: blocked
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    const csp = buildCsp(process.env.NEXT_PUBLIC_API_BASE_URL).join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;