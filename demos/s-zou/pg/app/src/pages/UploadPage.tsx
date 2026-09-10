import { useCallback, useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, LogIn, Link2, Copy, Lock } from "lucide-react";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "login-required" }
  | { kind: "error"; message: string }
  | { kind: "done"; url: string; customer: string; count: number };

// Quiet Atlas brand eyebrow — text only, no mark, keeps the layout uncluttered.
function Eyebrow() {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9197ad]">Atlas</p>;
}

// Standalone, authenticated upload page (light, emotion-inspired). The SWA gates
// this route to @celonis.com, so a VE reaching it is already signed in. We POST
// the demo zip to the linked /api/upload function, which derives the owner-slug
// from the caller's identity and writes to blob.
export default function UploadPage() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus({ kind: "error", message: "Please choose the .zip produced by /demo-deploy." });
      return;
    }
    setFileName(file.name);
    setStatus({ kind: "uploading" });
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      if (res.status === 401 || res.redirected || res.url.includes("/.auth/")) {
        setStatus({ kind: "login-required" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "error", message: body.error || `Upload failed (HTTP ${res.status}).` });
        return;
      }
      const body = await res.json();
      setStatus({ kind: "done", url: body.url, customer: body.customer, count: body.count });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Network error during upload." });
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload],
  );

  const busy = status.kind === "uploading";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6 text-[#0a1f44]"
      style={{
        background:
          "radial-gradient(1100px 560px at 50% -10%, #ffffff 0%, #eef1f8 58%, #e7eaf4 100%)",
        fontFamily:
          "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#e4e6f0] bg-white p-8 shadow-[0_18px_50px_-18px_rgba(10,31,68,0.25)]">
        <Eyebrow />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Publish your demo</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6b7088]">
          Upload the <code className="rounded bg-[#eef1f8] px-1 py-0.5 text-[12px] text-[#41476a]">.zip</code> Atlas
          generated for this customer. You'll get a link your Celonis colleagues can open — it's gated by{" "}
          <span className="whitespace-nowrap font-medium text-[#41476a]">@celonis.com</span> sign-in, so it's never
          public.
        </p>

        <div className="mt-6">
          <div
            role="button"
            tabIndex={0}
            aria-disabled={busy}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              "flex h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all duration-150",
              busy ? "cursor-default opacity-70" : "cursor-pointer",
              dragging
                ? "border-[#264aff] bg-[#264aff]/[0.06]"
                : "border-[#cfd4e8] bg-[#f7f8fd] hover:border-[#b9c0e0] hover:bg-[#f0f3ff]",
            ].join(" ")}
          >
            <div
              className={[
                "mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                dragging ? "bg-[#264aff]/10 text-[#264aff]" : "bg-[#eef1fb] text-[#8a90a8]",
              ].join(" ")}
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            </div>
            <p className="text-sm font-medium text-[#0a1f44]">
              {busy ? `Uploading ${fileName}…` : fileName ?? "Drop your demo .zip here"}
            </p>
            {!busy && <p className="mt-1 text-xs text-[#9197ad]">or click to choose a file</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
          </div>
          <p className="mt-3 text-xs text-[#9197ad]">
            Not sure where it is? Atlas saved it as{" "}
            <span className="font-mono">&lt;customer&gt;-demo.zip</span> in your{" "}
            <span className="font-mono">demos/</span> folder — or just ask Claude where it put the file.
          </p>
        </div>

        {status.kind === "login-required" && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#e4e6f0] bg-[#f7f8fd] p-4 text-sm">
            <span className="text-[#41476a]">Your session expired. Sign in again, then re-drop the zip.</span>
            <a
              href="/.auth/login/aad?post_login_redirect_uri=/upload"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#264aff] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2140d9]"
            >
              <LogIn className="h-4 w-4" /> Sign in
            </a>
          </div>
        )}

        {status.kind === "error" && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#f14848]/30 bg-[#f14848]/[0.07] p-4 text-sm text-[#b91c1c]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        {status.kind === "done" && (
          <div className="mt-5 rounded-xl border border-[#1f9d6b]/30 bg-[#1f9d6b]/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-[#147a51]">
              <CheckCircle2 className="h-4 w-4" /> Uploaded {status.count} file{status.count === 1 ? "" : "s"} for{" "}
              <span className="font-mono">{status.customer}</span>
            </p>
            <a
              href={status.url}
              className="mt-3 block break-all font-mono text-xs text-[#264aff] underline-offset-2 hover:underline"
            >
              {status.url}
            </a>
            <div className="mt-4 flex gap-2">
              <a
                href={status.url}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#264aff] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2140d9]"
              >
                <Link2 className="h-4 w-4" /> Open demo
              </a>
              <button
                onClick={() => navigator.clipboard?.writeText(status.url)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7dbe9] bg-white px-3.5 py-2 text-sm font-medium text-[#0a1f44] transition-colors hover:bg-[#f3f5fb]"
              >
                <Copy className="h-4 w-4" /> Copy link
              </button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6b7088]">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Only people signed in with @celonis.com can open this link — it isn't public.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
