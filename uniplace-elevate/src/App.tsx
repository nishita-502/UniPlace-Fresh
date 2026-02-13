import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// Page Imports
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import JobPostings from "./pages/JobPostings";
import Results from "./pages/Results";
import StudentsDatabase from "./pages/StudentsDatabase";
import CompaniesPOC from "./pages/CompaniesPOC";
import Events from "./pages/Events";
import Hackathons from "./pages/Hackathons";
import BlogsApproval from "./pages/BlogsApproval";
import EmailCenter from "./pages/EmailCenter";
import ReportsExports from "./pages/ReportsExports";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Active Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* PUBLIC ROUTE: Login */}
            {/* If logged in, redirect to Dashboard. If not, show Login. */}
            <Route
              path="/login"
              element={!session ? <Login /> : <Navigate to="/" replace />}
            />

            {/* PROTECTED ROUTES */}
            {/* If logged in, show AdminLayout. If not, redirect to Login. */}
            <Route element={session ? <AdminLayout /> : <Navigate to="/login" replace />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/job-postings" element={<JobPostings />} />
              <Route path="/results" element={<Results />} />
              <Route path="/students" element={<StudentsDatabase />} />
              <Route path="/companies-poc" element={<CompaniesPOC />} />
              <Route path="/events" element={<Events />} />
              <Route path="/hackathons" element={<Hackathons />} />
              <Route path="/blogs" element={<BlogsApproval />} />
              <Route path="/email" element={<EmailCenter />} />
              <Route path="/reports" element={<ReportsExports />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}