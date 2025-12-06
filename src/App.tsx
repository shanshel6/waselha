import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Trips from "./pages/Trips";
import MyProfile from "./pages/MyProfile";
import Verification from "./pages/Verification";
import AddTrip from "./pages/AddTrip";
import TripDetails from "./pages/TripDetails";
import MyRequests from "./pages/MyRequests";
import Chat from "./pages/Chat";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import PlaceOrder from "./pages/PlaceOrder";
import MyTripsPage from "./pages/MyTripsPage"; // Import new page
import Navbar from "./components/Navbar";
import ChatNotificationListener from "./components/ChatNotificationListener";
import ProfileCheckWrapper from "./components/ProfileCheckWrapper";
import { SessionContextProvider, useSession } from "./integrations/supabase/SessionContextProvider";

const queryClient = new QueryClient();

const MainLayout = () => (
  <>
    <Navbar />
    <ChatNotificationListener />
    <ProfileCheckWrapper>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:tripId" element={<TripDetails />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/add-trip" element={<AddTrip />} />
        <Route path="/my-requests" element={<MyRequests />} />
        <Route path="/my-flights" element={<MyTripsPage />} /> {/* New Route */}
        <Route path="/chat/:requestId" element={<Chat />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/place-order" element={<PlaceOrder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ProfileCheckWrapper>
  </>
);

const AppContent = () => {
  const { isLoading } = useSession();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-gray-700 dark:text-gray-300">
        Loading application...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <AppContent />
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;