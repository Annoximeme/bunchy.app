import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Caddy already strips `Server` on the way out; advertising the framework
  // here undoes that for no benefit. It tells a scanner which CVE list to try
  // and tells nobody else anything.
  poweredByHeader: false,
  // Emits `.next/standalone`, a self-contained server with only the modules
  // actually reached, traced from the entry points. It is what makes the
  // production image ~200MB instead of ~1.5GB, and it is inert during
  // development, so it costs nothing to leave on.
  output: "standalone",
  // The Prisma engine and pg driver must stay external to the server bundle.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
