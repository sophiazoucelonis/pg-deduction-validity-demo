import { useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EnhancedColumn<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

type StatusVariant = "success" | "warning" | "error" | "info" | "neutral";
type PriorityLevel = "high" | "medium" | "low";

interface DataTableEnhancedProps<T> {
  columns: EnhancedColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  showCheckbox?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  className?: string;
}

const statusStyles: Record<StatusVariant, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
  neutral: "bg-muted text-muted-foreground",
};

const priorityStyles: Record<PriorityLevel, { color: string; icon: boolean }> = {
  high: { color: "text-destructive", icon: true },
  medium: { color: "text-warning", icon: true },
  low: { color: "text-muted-foreground", icon: false },
};

export function StatusPill({ status, variant }: { status: string; variant: StatusVariant }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
      statusStyles[variant]
    )}>
      {status}
    </span>
  );
}

export function PriorityIndicator({ level, label }: { level: PriorityLevel; label: string }) {
  const style = priorityStyles[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", style.color)}>
      {style.icon && <Flag className="h-3 w-3" />}
      {label}
    </span>
  );
}

export function DataTableEnhanced<T extends object>({
  columns,
  data,
  onRowClick,
  showCheckbox = true,
  showPagination = true,
  pageSize = 10,
  className,
}: DataTableEnhancedProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = showPagination ? data.slice(startIndex, endIndex) : data;

  const getValue = (row: T, key: string): unknown => {
    if (key.includes('.')) {
      return key.split('.').reduce((obj: unknown, k) => {
        if (obj && typeof obj === 'object' && k in obj) {
          return (obj as Record<string, unknown>)[k];
        }
        return undefined;
      }, row);
    }
    return (row as Record<string, unknown>)[key];
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(currentData.map((_, i) => startIndex + i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const allSelected = currentData.length > 0 && currentData.every((_, i) => selectedRows.has(startIndex + i));

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            {showCheckbox && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={cn("text-xs font-semibold text-foreground", column.className)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((row, rowIndex) => {
            const actualIndex = startIndex + rowIndex;
            return (
              <TableRow
                key={actualIndex}
                className={cn(
                  "transition-colors",
                  selectedRows.has(actualIndex) && "bg-primary/5",
                  onRowClick && "cursor-pointer hover:bg-accent/5"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {showCheckbox && (
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.has(actualIndex)}
                      onCheckedChange={(checked) => handleSelectRow(actualIndex, checked as boolean)}
                      aria-label={`Select row ${actualIndex + 1}`}
                    />
                  </TableCell>
                )}
                {columns.map((column) => {
                  const value = getValue(row, String(column.key));
                  return (
                    <TableCell
                      key={String(column.key)}
                      className={cn("text-sm", column.className)}
                    >
                      {column.render
                        ? column.render(value as T[keyof T], row)
                        : String(value ?? "")}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 px-0"
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
