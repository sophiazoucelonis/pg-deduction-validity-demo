import { CheckCircle2 } from "lucide-react";

// Shown at "/" on the deployed SWA (blob mode). After SSO, Azure returns the
// user to the site root rather than their original deep link, so instead of a
// 404 we show a clean "you're in — open your demo link" page. Demos are
// deep-link-only (the app can't enumerate them from blob). Light, Atlas-branded.
export default function RootLanding() {
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
      <div className="w-full max-w-md rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center shadow-[0_18px_50px_-18px_rgba(10,31,68,0.25)]">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#9197ad]">Atlas</p>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f9d6b]/10 ring-1 ring-[#1f9d6b]/25">
          <CheckCircle2 className="h-7 w-7 text-[#147a51]" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">You're signed in</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6b7088]">
          Open your demo using the link you were given — just click it again.
        </p>
        <p className="mt-5 text-xs text-[#9197ad]">
          Atlas demo links look like{" "}
          <span className="whitespace-nowrap rounded bg-[#eef1f8] px-1.5 py-0.5 font-mono text-[#41476a]">
            …/&lt;owner&gt;/&lt;customer&gt;/&lt;screen&gt;
          </span>
        </p>
      </div>
    </div>
  );
}
