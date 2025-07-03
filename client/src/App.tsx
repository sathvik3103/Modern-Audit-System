import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DataUploadPage from "@/pages/data-upload";
import DataExplorationPage from "@/pages/data-exploration";
import AuditDashboard from "@/pages/audit-dashboard";
import MLAnalysisPage from "@/pages/ml-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DataUploadPage} />
      <Route path="/explore" component={DataExplorationPage} />
      <Route path="/audit" component={AuditDashboard} />
      <Route path="/ml-analysis" component={MLAnalysisPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
