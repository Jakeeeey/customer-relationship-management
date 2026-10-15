import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
    outputFileTracingRoot: path.join(__dirname),
  /* config options here */
  allowedDevOrigins: ['msi-andrie', 'msi-jake', '100.81.225.79', '100.124.104.46', 'msi-eulysis', '100.67.250.58','100.114.249.96'],
};

export default nextConfig;