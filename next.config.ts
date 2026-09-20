import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

/**
 * PWA com Serwist (sucessor mantido do next-pwa, que não suporta o App
 * Router do Next 15). O service worker é gerado a partir de
 * `src/app/sw.ts` e desligado em desenvolvimento, senão o cache atrapalha
 * o hot reload.
 */
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // A demonstração não usa imagens remotas; tudo é CSS e SVG inline.
  images: { remotePatterns: [] },
};

export default withSerwist(nextConfig);
