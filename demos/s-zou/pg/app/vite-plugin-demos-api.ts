import type { Plugin } from "vite";
import path from "path";
import {
  type DemosApiOptions,
  buildResponse,
  findTalktrack,
  listRegistrySources,
  addRegistrySource,
  removeRegistrySource,
  pickDirectory,
  readJsonBody,
} from "./demos-api-core";

export type { DemosApiOptions };

// Thin Vite-dev adapter over demos-api-core. The same core also powers the
// standalone no-build launcher (server/standalone.ts), so the two never diverge.
// No generateBundle here: the production bundle is a pure SPA; local `/api/*`
// is served by Vite dev (here) or the standalone launcher, and blob/SWA mode
// never calls these endpoints.
export default function demosApiPlugin(rawOpts: DemosApiOptions): Plugin {
  // Resolve the two __dirname-relative paths here (valid in the source tree);
  // the core stays path-agnostic.
  const opts: DemosApiOptions = {
    ...rawOpts,
    baseContextModelPath:
      rawOpts.baseContextModelPath ??
      path.join(__dirname, "src/data/base-context-model.yaml"),
    fixturesDir:
      rawOpts.fixturesDir ?? path.resolve(__dirname, "..", "assets", "fixtures"),
  };

  return {
    name: "demos-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Local data-source config — matches what the standalone launcher serves.
        if (req.url === "/config.json") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify({ mode: "local" }));
          return;
        }

        if (req.url === "/api/demos") {
          try {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(buildResponse(opts)));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        const talktrackMatch = req.url?.match(/^\/api\/talktrack\/([^/?]+)\/([^/?]+)/);
        if (talktrackMatch) {
          const owner = decodeURIComponent(talktrackMatch[1]);
          const customer = decodeURIComponent(talktrackMatch[2]);
          try {
            const md = findTalktrack(opts, owner, customer);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ owner, customer, markdown: md }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        if (req.url === "/api/sources" && req.method === "GET") {
          try {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(listRegistrySources(opts)));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
          return;
        }

        if (req.url === "/api/sources" && req.method === "POST") {
          readJsonBody(req, (err, body) => {
            if (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid JSON" }));
              return;
            }
            try {
              addRegistrySource(opts, body as { registry: string; name: string; path: string });
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        if (req.url === "/api/sources" && req.method === "DELETE") {
          readJsonBody(req, (err, body) => {
            if (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid JSON" }));
              return;
            }
            try {
              removeRegistrySource(opts, body as { registry: string; name: string });
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }

        if (req.url === "/api/pick-directory" && req.method === "POST") {
          pickDirectory(opts).then(
            (result) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(result));
            },
            (err) => {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            },
          );
          return;
        }

        next();
      });
    },
  };
}
