import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import yaml from "@modyfi/vite-plugin-yaml";
import demosApi, { type DemosApiOptions } from "./vite-plugin-demos-api";
import path from "path";
import os from "os";

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const userRegistryPath = path.join(os.homedir(), ".claude", "atlas", "demos.yaml");
const fallbackDir = process.env.ATLAS_DEMOS_DIR;

const demosApiOpts: DemosApiOptions = {
  projectDir,
  userRegistryPath,
  fallbackDir,
};

const extraFsAllows: string[] = [];
if (fallbackDir) extraFsAllows.push(path.resolve(fallbackDir));
extraFsAllows.push(path.join(projectDir, ".atlas"));
extraFsAllows.push(path.join(os.homedir(), ".claude", "atlas"));

export default defineConfig(() => ({
  base: "/pg-deduction-validity-demo/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    fs: {
      allow: [path.resolve(__dirname), ...extraFsAllows],
    },
  },
  plugins: [react(), yaml(), demosApi(demosApiOpts)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
