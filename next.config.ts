import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/ajustes",
        destination: "/perfil",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
