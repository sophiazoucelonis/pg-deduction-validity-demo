import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";

interface FormConditionalSectionProps {
  selectedOption?: string;
  className?: string;
}

export function FormConditionalSection({
  selectedOption,
  className,
}: FormConditionalSectionProps) {
  if (!selectedOption) return null;

  return (
    <div className={cn("mt-6 space-y-4", className)}>
      {/* Confirm Order Section */}
      {selectedOption === "confirm" && (
        <div className="border border-border rounded-md">
          <div className="bg-muted/30 px-4 py-3 border-b border-border">
            <span className="font-medium text-sm">Confirm Order</span>
          </div>
          <div className="p-4 space-y-4">
            {/* Info Message */}
            <div className="bg-primary/10 border border-primary/30 border-dashed rounded-md p-3">
              <p className="text-sm text-primary">
                Please update the requested delivery date, if necessary. Thank you.
              </p>
            </div>

            {/* Delivery Date Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Delivery Date <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  defaultValue="Thursday 12, February 2026"
                  className="h-10 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Partially Confirm Section */}
      {selectedOption === "partial" && (
        <>
          {/* Info Message */}
          <div className="bg-primary/10 border border-primary/30 border-dashed rounded-md p-3">
            <p className="text-sm text-primary">
              Please provide the details about all quantities and expected delivery dates - Thank you.
            </p>
          </div>

          {/* Panel Container */}
          <div className="border border-border rounded-md">
            <div className="bg-muted/30 px-4 py-3 border-b border-border">
              <span className="font-medium text-sm">Panel</span>
            </div>
            <div className="p-4">
              {/* Column Headers */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <span className="text-xs text-muted-foreground font-medium">Partial Quantity</span>
                <span className="text-xs text-muted-foreground font-medium">Delivery Date</span>
              </div>

              {/* Input Row */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Partial Quantity <span className="text-destructive">*</span>
                  </label>
                  <Input defaultValue="40" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Delivery Date <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      defaultValue="Thursday 12, February 2026"
                      className="h-10 pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-4">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Save
                </Button>
                <Button size="sm" variant="destructive">
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Add Delivery Button */}
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            Add Delivery
          </Button>

          {/* Total Confirmed Quantity */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Total Confirmed Quantity <span className="text-destructive">*</span>
            </label>
            <Input
              defaultValue="0"
              readOnly
              className="h-10 bg-muted/50"
            />
          </div>
        </>
      )}

      {/* Cancel Order Section */}
      {selectedOption === "cancel" && (
        <div className="border border-border rounded-md">
          <div className="bg-muted/30 px-4 py-3 border-b border-border">
            <span className="font-medium text-sm">Cancel Order</span>
          </div>
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive/30 border-dashed rounded-md p-3">
              <p className="text-sm text-destructive">
                Please confirm that you want to cancel this order. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
