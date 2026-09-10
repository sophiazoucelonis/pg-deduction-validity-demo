import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  onRowClick,
  className,
}: DataTableProps<T>) {
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

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
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
          {data.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-accent/5"
              )}
              onClick={() => onRowClick?.(row)}
            >
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
