import CopilotStudioScreen from "@/components/copilot/CopilotStudioScreen";
import { copilotSampleData, type CopilotStudioData } from "@/types/copilot-studio";
import { useCopilotData } from "@/contexts/DemoDataContext";
import { useParams } from "react-router-dom";

export default function CopilotPage() {
  const { owner, customer } = useParams<{ owner: string; customer: string }>();
  const copilotData = useCopilotData(owner, customer);
  const data: CopilotStudioData = copilotData ?? copilotSampleData;

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <CopilotStudioScreen data={data} />
    </div>
  );
}
