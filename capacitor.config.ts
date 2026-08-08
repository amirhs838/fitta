import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "https://fitta-fawn.vercel.app";

/**
 * This app relies on Next.js Route Handlers and server-side auth, so the
 * native shell loads the deployed web application rather than a static export.
 * CAPACITOR_SERVER_URL overrides the production URL for a custom domain or local emulator build.
 */
const config: CapacitorConfig = {
  appId: "ir.fitta.health",
  appName: "فیتا",
  webDir: "capacitor/www",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          androidScheme: "https",
          iosScheme: "https",
        },
      }
    : {}),
};

export default config;
