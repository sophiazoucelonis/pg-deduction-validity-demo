import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface PrepModeContextValue {
  prepMode: boolean;
  togglePrepMode: () => void;
  setPrepMode: (next: boolean) => void;
}

const PrepModeContext = createContext<PrepModeContextValue>({
  prepMode: false,
  togglePrepMode: () => {},
  setPrepMode: () => {},
});

const STORAGE_KEY = "atlas:prep-mode";

function readInitialMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "prep") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "1";
}

export function PrepModeProvider({ children }: { children: ReactNode }) {
  const [prepMode, setPrepModeState] = useState<boolean>(readInitialMode);

  const setPrepMode = useCallback((next: boolean) => {
    setPrepModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage failures (private mode, quota, etc.) — state still works in-memory.
    }
  }, []);

  const togglePrepMode = useCallback(() => {
    setPrepMode(!prepMode);
  }, [prepMode, setPrepMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePrepMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePrepMode]);

  return (
    <PrepModeContext.Provider value={{ prepMode, togglePrepMode, setPrepMode }}>
      {children}
    </PrepModeContext.Provider>
  );
}

export function usePrepMode() {
  return useContext(PrepModeContext);
}
