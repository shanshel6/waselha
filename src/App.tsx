import React from "react";
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
import MyRequests from "./pages/MyRequests";
import Chat from "./pages/Chat";
import CompleteProfile from "./pages/CompleteProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerificationDashboard from "./pages/AdminVerificationDashboard";
import AdminMakeAccounts from "./pages/AdminMakeAccounts";
import MyTripsPage from "./pages/MyTripsPage";
import Navbar from "./components/Navbar";
import ChatNotificationListener from "./components/ChatNotificationListener";
import ProfileCheckWrapper from "./components/ProfileCheckWrapper";
import { SessionContextProvider, useSession } from "./integrations/supabase/SessionContextProvider";
import PlaceOrder from "./pages/PlaceOrder";
import ChatUnreadNotificationBridge from "./components/ChatUnreadNotificationBridge";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Footer from "./components/Footer";
import AdminPayments from "./pages/AdminPayments";
import AdminReports from "./pages/AdminReports";
import AuthGuard from "./components/AuthGuard";
import TripDetails from "./pages/TripDetails";

const queryClient = new QueryClient();

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
      {/* Public routes - no AuthGuard */}
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/trips" element={<Trips />} />
      <Route path="/trips/:tripId" element={<TripDetails />} />
      
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      
      {/* Protected routes - wrapped with AuthGuard */}
      <Route path="/my-profile" element={
        <AuthGuard>
          <MyProfile />
        </AuthGuard>
      } />
      <Route path="/verification" element={
        <AuthGuard>
          <Verification />
        </AuthGuard>
      } />
      <Route path="/add-trip" element={
        <AuthGuard>
          <AddTrip />
        </AuthGuard>
      } />
      <Route path="/my-requests" element={
        <AuthGuard>
          <MyRequests />
        </AuthGuard>
      } />
      <Route path="/my-flights" element={
        <AuthGuard>
          <MyTripsPage />
        </AuthGuard>
      } />
      <Route path="/chat/:requestId" element={
        <AuthGuard>
          <Chat />
        </AuthGuard>
      } />
      <Route path="/admin/dashboard" element={
        <AuthGuard>
          <AdminDashboard />
        </AuthGuard>
      } />
      <Route path="/admin/verifications" element={
        <AuthGuard>
          <AdminVerificationDashboard />
        </AuthGuard>
      } />
      <Route path="/admin/makeaccounts" element={
        <AuthGuard>
          <AdminMakeAccounts />
        </AuthGuard>
      } />
      <Route path="/admin/payments" element={
        <AuthGuard>
          <AdminPayments />
        </AuthGuard>
      } />
      <Route path="/admin/reports" element={
        <AuthGuard>
          <AdminReports />
        </AuthGuard>
      } />
      <Route path="/place-order" element={
        <AuthGuard>
          <PlaceOrder />
        </AuthGuard>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const basename = import.meta.env.VITE_APP_BASE_PATH || '/';

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={basename}>
          <SessionContextProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <ChatNotificationListener />
              <ChatUnreadNotificationBridge />
              <ProfileCheckWrapper>
                <main className="flex-grow">
                  <AppContent />
                </main>
              </ProfileCheckWrapper>
              <Footer />
            </div>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;