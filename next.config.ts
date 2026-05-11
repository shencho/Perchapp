import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/perfil",       destination: "/ajustes",                 permanent: true },
      { source: "/preferencias", destination: "/ajustes",                 permanent: true },
      { source: "/plantillas",   destination: "/movimientos-recurrentes", permanent: true },
    ];
  },
};

export default nextConfig;
