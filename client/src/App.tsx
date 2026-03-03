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
import CustomerSegments from "./pages/CustomerSegments";
import GeoHeatmap from "./pages/GeoHeatmap";
import AIMessages from "./pages/AIMessages";
import HealthCard from "./pages/HealthCard";
import SettingsPage from "./pages/SettingsPage";
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
            <Route path="/bulk" element={<BulkPrediction />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/revenue" element={<RevenueImpact />} />
            <Route path="/segments" element={<CustomerSegments />} />
            <Route path="/geo" element={<GeoHeatmap />} />
            <Route path="/messages" element={<AIMessages />} />
            <Route path="/health" element={<HealthCard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
