import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const cliPort = Number(
  process.env.BACKEND_PORT || process.env.PORT || "",
);

const rawHost = process.env.HOST || "";
const tunnelHost = rawHost
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const isHttpsTunnel = rawHost.startsWith("https://") && tunnelHost.length > 0;

const hmrConfig = isHttpsTunnel
  ? {
      protocol: "wss" as const,
      host: tunnelHost,
      clientPort: 443,
    }
  : {
      protocol: "ws" as const,
      host: "localhost",
    };

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    allowedHosts: [".trycloudflare.com", ".ngrok.io"],
    host: "localhost",
    port: Number.isFinite(cliPort) && cliPort > 0 ? cliPort : 5173,
    strictPort: false,
    hmr: hmrConfig,
  },
});
