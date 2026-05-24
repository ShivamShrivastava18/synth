/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output produces a self-contained server.js suitable for
  // a slim Cloud Run container.
  output: "standalone",
};

export default nextConfig;
