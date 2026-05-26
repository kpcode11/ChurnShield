import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import PredictCustomer from "./pages/PredictCustomer";
import BulkPrediction from "./pages/BulkPrediction";
import Analytics from "./pages/Analytics";
import RevenueImpact from "./pages/RevenueImpact";
import AIMessages from "./pages/AIMessages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/predict" element={<PredictCustomer />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* <Route path="/bulk" element={<BulkPrediction />} />
            <Route path="/revenue" element={<RevenueImpact />} />
            <Route path="/messages" element={<AIMessages />} /> */}
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
