import { usePrepMode } from "@/contexts/PrepModeContext";
import { Hotspot } from "./Hotspot";

interface PrepOverlayProps {
  hotspots?: { selector?: string; label: string; order: number }[];
}

export function PrepOverlay({ hotspots }: PrepOverlayProps) {
  const { prepMode } = usePrepMode();
  if (!prepMode || !hotspots || hotspots.length === 0) return null;

  const ordered = [...hotspots]
    .filter((h) => !!h.selector)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {ordered.map((h, i) => (
        <Hotspot
          key={`${h.selector}-${i}`}
          selector={h.selector!}
          label={h.label}
          order={h.order}
        />
      ))}
    </>
  );
}
