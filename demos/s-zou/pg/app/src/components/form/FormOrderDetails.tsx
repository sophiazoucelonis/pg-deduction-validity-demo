import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface OrderField {
  label: string;
  value: string;
  hasCalendar?: boolean;
}

interface FormOrderDetailsProps {
  fields?: OrderField[];
  className?: string;
}

const defaultFields: OrderField[] = [
  { label: "Order Number", value: "4500019725" },
  { label: "Position", value: "00030" },
  { label: "Product Description", value: "Carbon Steel" },
  { label: "Quantity", value: "26" },
  { label: "Requested Delivery Date", value: "Thursday 12, February 2026", hasCalendar: true },
];

export function FormOrderDetails({
  fields = defaultFields,
  className,
}: FormOrderDetailsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Section Header */}
      <div className="bg-[#264bff] text-white px-4 py-2.5 rounded-t-md">
        <span className="font-medium text-sm">Order Details</span>
      </div>

      {/* Fields Row */}
      <div className="grid grid-cols-5 gap-4 px-1">
        {fields.map((field, index) => (
          <div key={index} className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              {field.label}
            </label>
            <div className="relative">
              <Input
                value={field.value}
                readOnly
                className="h-9 bg-muted/30 border-border text-sm pr-8"
              />
              {field.hasCalendar && (
                <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
