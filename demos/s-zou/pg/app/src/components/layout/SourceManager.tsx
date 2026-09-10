import { useState, useEffect, useCallback } from "react";
import { Settings, Plus, Trash2, FolderOpen, Globe, HardDrive, FolderSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemoData } from "@/contexts/DemoDataContext";
import { cn } from "@/lib/utils";

interface RegistrySource {
  registry: "project" | "user";
  name: string;
  path: string;
  resolvedPath: string;
}

type RegistryType = "project" | "user";

const registryLabels: Record<RegistryType, { label: string; icon: typeof HardDrive; description: string }> = {
  project: { label: "Project", icon: HardDrive, description: "Scoped to this project" },
  user: { label: "User", icon: Globe, description: "Shared across all projects" },
};

export function SourceManager() {
  const { refresh } = useDemoData();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<RegistrySource[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [newRegistry, setNewRegistry] = useState<RegistryType>("project");
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      if (res.ok) setSources(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSources();
      setAdding(false);
      setError(null);
    }
  }, [open, fetchSources]);

  const handleAdd = async () => {
    if (!newName.trim() || !newPath.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry: newRegistry, name: newName.trim(), path: newPath.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add source");
        return;
      }
      setNewName("");
      setNewPath("");
      setAdding(false);
      await fetchSources();
      refresh();
    } catch {
      setError("Failed to add source");
    }
  };

  const handleRemove = async (source: RegistrySource) => {
    setError(null);
    try {
      const res = await fetch("/api/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registry: source.registry, name: source.name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove source");
        return;
      }
      await fetchSources();
      refresh();
    } catch {
      setError("Failed to remove source");
    }
  };

  const projectSources = sources.filter((s) => s.registry === "project");
  const userSources = sources.filter((s) => s.registry === "user");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1 rounded hover:bg-sidebar-hover text-sidebar-icon transition-colors"
          aria-label="Manage demo sources"
          title="Manage demo sources"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Demo Sources
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              {[
                { key: "project" as RegistryType, items: projectSources },
                { key: "user" as RegistryType, items: userSources },
              ].map(({ key, items }) => {
                const { label, icon: Icon, description } = registryLabels[key];
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">{description}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 pl-5 mb-2">No sources</p>
                    ) : (
                      <div className="space-y-1 mb-2">
                        {items.map((s) => (
                          <div
                            key={`${s.registry}-${s.name}`}
                            className="flex items-center gap-2 pl-5 pr-1 py-1.5 rounded-md group hover:bg-accent/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{s.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate" title={s.resolvedPath}>
                                {s.path}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemove(s)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                              aria-label={`Remove ${s.name}`}
                              title="Remove source"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {adding ? (
            <div className="border rounded-lg p-3 space-y-3 bg-accent/20">
              <div className="flex gap-2">
                {(["project", "user"] as RegistryType[]).map((r) => {
                  const { label, icon: Icon } = registryLabels[r];
                  return (
                    <button
                      key={r}
                      onClick={() => setNewRegistry(r)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        newRegistry === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="source-name" className="text-xs">Name</Label>
                  <Input
                    id="source-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Team library"
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="source-path" className="text-xs">Path</Label>
                  <div className="flex gap-1.5">
                    <Input
                      id="source-path"
                      value={newPath}
                      onChange={(e) => setNewPath(e.target.value)}
                      placeholder="e.g. .atlas/demos or /absolute/path"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 flex-shrink-0"
                      title="Browse..."
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/pick-directory", { method: "POST" });
                          if (!res.ok) return;
                          const data = await res.json();
                          const picked = newRegistry === "project" && data.relativePath
                            ? data.relativePath
                            : data.path;
                          setNewPath(picked);
                          if (!newName.trim()) {
                            const last = picked.split("/").filter(Boolean).pop() ?? "";
                            setNewName(last.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
                          }
                        } catch {
                          // user cancelled or unsupported
                        }
                      }}
                    >
                      <FolderSearch className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !newPath.trim()}>
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdding(true)}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Source
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
