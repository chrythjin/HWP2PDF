import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js hydration) + AdSense SDK + Firebase App
  "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.gstatic.com https://www.googleapis.com",
  // Styles: self + inline (Next.js styled-jsx) + Google Fonts CSS
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: self + Google Fonts file CDN
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self + data: (inline) + blob: (object URLs) + AdSense ad images + GCS
  "img-src 'self' data: blob: https: http:",
  // Connect: self + Firebase Auth + Firestore + GCS upload
  "connect-src 'self' https://www.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  // Frames: AdSense renders ads in iframes
  "frame-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com",
  // Object/embed: blocked
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives.join("; "),
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
