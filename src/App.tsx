import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Trips from "./pages/Trips";
import MyProfile from "./pages/MyProfile";
import Verification from "./pages/Verification";
import AddTrip from "./pages/AddTrip";
import TripDetails from "./pages/TripDetails";
import MyRequests from "./pages/MyRequests"; // Import new page
import Navbar from "./components/Navbar";
import { SessionContextProvider, useSession } from "./integrations/supabase/SessionContextProvider";

const queryClient = new QueryClient();

// A component to wrap the main application content, dependent on session loading
const AppContent = () => {
  const { isLoading } = useSession(); // Access loading state from context

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-700 dark:text-gray-300">
        Loading application...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:tripId" element={<TripDetails />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/verify" element={<Verification />} />
        <Route path="/add-trip" element={<AddTrip />} />
        <Route path="/my-requests" element={<MyRequests />} /> {/* New route */}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  console.log("App component rendering...");
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <AppContent /> {/* Render AppContent inside SessionContextProvider */}
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;