import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // La extracción de SAP del PyG pesa varios MB: las acciones de servidor la reciben completa.
    serverActions: { bodySizeLimit: "30mb" },
    proxyClientMaxBodySize: "30mb",
  },
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
