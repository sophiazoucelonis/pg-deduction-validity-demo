import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FormRadioOptionsProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: { id: string; label: string }[];
  className?: string;
}

const defaultOptions = [
  { id: "confirm", label: "Confirm Order" },
  { id: "partial", label: "Partially Confirm" },
  { id: "cancel", label: "Cancel Order" },
];

export function FormRadioOptions({
  value,
  onChange,
  options = defaultOptions,
  className,
}: FormRadioOptionsProps) {
  return (
    <div className={cn("pt-4", className)}>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="flex items-center gap-6"
      >
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="text-sm font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
