import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import NotFound from "./pages/NotFound";
import RootLanding from "./pages/RootLanding";
import BoardPage from "./pages/BoardPage";
import CopilotPage from "./pages/CopilotPage";
import UploadPage from "./pages/UploadPage";
import {
  DashboardTemplate,
  ActionFlowTemplate,
  OrchestrationTemplate,
  FormTemplate,
  AnnotationBuilderTemplate,
  ProcessCopilotTemplate,
  ProcessExplorerTemplate,
  KnowledgeModelTemplate,
} from "./pages/templates";
import MSCopilotLoginPage from "./pages/templates/MSCopilotLoginPage";
import MSCopilotStudioPage from "./pages/templates/MSCopilotStudioPage";
import {
  useDemoRoutes,
  DemoDataProvider,
  isProductionBlobMode,
} from "@/contexts/DemoDataContext";
import { PrepModeProvider } from "@/contexts/PrepModeContext";

const queryClient = new QueryClient();

function DemoRoute() {
  const { owner, customer, component } = useParams<{
    owner: string;
    customer: string;
    component: string;
  }>();
  const demoRoutes = useDemoRoutes();
  const route = demoRoutes.find(
    (r) =>
      r.owner === owner &&
      r.customer === customer &&
      r.component === component,
  );
  if (!route) return <NotFound />;
  if (route.data.view_kind !== "board") {
    console.warn(
      `[demo-prototype] Unknown view_kind "${route.data.view_kind}" (demo: ${owner}/${customer}/${component}).`,
    );
    return <NotFound />;
  }
  return <BoardPage key={`${owner}/${customer}/${component}`} data={route.data} />;
}

function LandingRedirect() {
  const demoRoutes = useDemoRoutes();
  // In production (blob mode) there is no demo at "/" — and Azure returns users
  // here after SSO instead of their original deep link — so show a friendly
  // "open your link" page rather than a 404. Local dev keeps redirect-to-first.
  if (isProductionBlobMode()) return <RootLanding />;
  const firstRoute =
    demoRoutes.find((r) => !r.customer.startsWith("_")) ?? demoRoutes[0];
  if (!firstRoute) return <NotFound />;
  return (
    <Navigate
      to={`/${firstRoute.owner}/${firstRoute.customer}/${firstRoute.component}`}
      replace
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <DemoDataProvider>
        <PrepModeProvider>
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/:owner/:customer/:component" element={<DemoRoute />} />
          <Route path="/copilot/:owner/:customer" element={<CopilotPage />} />
          <Route path="/templates/dashboard" element={<DashboardTemplate />} />
          <Route path="/templates/action-flow" element={<ActionFlowTemplate />} />
          <Route path="/templates/orchestration" element={<OrchestrationTemplate />} />
          <Route path="/templates/form" element={<FormTemplate />} />
          <Route path="/templates/annotation-builder" element={<AnnotationBuilderTemplate />} />
          <Route path="/templates/process-copilot" element={<ProcessCopilotTemplate />} />
          <Route path="/templates/process-explorer" element={<ProcessExplorerTemplate />} />
          <Route path="/templates/knowledge-model" element={<KnowledgeModelTemplate />} />
          <Route path="/ms-copilot-login" element={<MSCopilotLoginPage />} />
          <Route path="/ms-copilot-studio" element={<MSCopilotStudioPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PrepModeProvider>
        </DemoDataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
