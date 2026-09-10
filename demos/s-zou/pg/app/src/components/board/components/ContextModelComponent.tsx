import type { ContextModelSpec } from "@/types/context-model";
import { ContextModelGraph } from "@/components/context-model";

interface Props {
  spec: ContextModelSpec;
}

export function ContextModelComponent({ spec }: Props) {
  return (
    <div className="w-full h-full">
      <ContextModelGraph spec={spec} />
    </div>
  );
}
