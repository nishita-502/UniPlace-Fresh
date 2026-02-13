import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import JobProfiles from "./pages/JobProfiles";
import MyProfile from "./pages/MyProfile";
import Interviews from "./pages/Interviews";
import Assessments from "./pages/Assessments";
import Events from "./pages/Events";
import Competitions from "./pages/Competitions";
import Resume from "./pages/Resume";
import SeniorBlogs from "./pages/SeniorBlogs";
import NotFound from "./pages/NotFound";
import BlogPost from "./pages/BlogPost";
import AddBlog from "./pages/AddBlog";
import MyBlogs from "./pages/MyBlogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* FIXED: Matched Sidebar path "/jobs" */}
          <Route path="/jobs" element={<JobProfiles />} />

          {/* FIXED: Matched Sidebar path "/profile" */}
          <Route path="/profile" element={<MyProfile />} />

          <Route path="/interviews" element={<Interviews />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/events" element={<Events />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/resume" element={<Resume />} />

          <Route path="/senior-blogs" element={<SeniorBlogs />} />
          <Route path="/senior-blogs/:id" element={<BlogPost />} />
          <Route path="/add-blog" element={<AddBlog />} />
          <Route path="/my-blogs" element={<MyBlogs />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
