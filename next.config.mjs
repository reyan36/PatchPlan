/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a production build run beside `next dev` without both writing to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Tree-shake icon barrels so each page only ships the icons it uses.
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react"],
  },
  async headers() {
    const prod = process.env.NODE_ENV === 'production';
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
      // Popups stay allowed for Google sign-in.
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      ...(prod ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
    ];
    // Blocks plugins, <base> hijacking and forms posting elsewhere. Scripts aren't restricted here
    // because Firebase, tldraw and Google sign-in load from several hosts.
    const csp = (frameAncestors) =>
      `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${frameAncestors}${prod ? '; upgrade-insecure-requests' : ''}`;
    const rules = [
      // The app can't be framed by other sites (clickjacking).
      { source: '/:path*', headers: [...security, { key: 'Content-Security-Policy', value: csp("'self'") }] },
      // Public roadmap, news and beta pages may be embedded on a studio's own site.
      { source: '/p/:path*', headers: [{ key: 'Content-Security-Policy', value: csp('*') }] },
    ];
    if (process.env.NODE_ENV !== 'production') {
      return rules;
    }
    return [
      ...rules,
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
