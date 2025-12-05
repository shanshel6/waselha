import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Trips from "./pages/Trips"; // New: Import Trips page
import Search from "./pages/Search"; // New: Import Search page
import MyProfile from "./pages/MyProfile"; // New: Import MyProfile page
import Verification from "./pages/Verification"; // New: Import Verification page
import Navbar from "./components/Navbar"; // New: Import Navbar
import { SessionContextProvider } from "./integrations/supabase/SessionContextProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Navbar /> {/* Navbar is now part of the main layout */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/trips" element={<Trips />} /> {/* New: Trips route */}
            <Route path="/search" element={<Search />} /> {/* New: Search route */}
            <Route path="/my-profile" element={<MyProfile />} /> {/* New: My Profile route */}
            <Route path="/verify" element={<Verification />} /> {/* New: Verification route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;