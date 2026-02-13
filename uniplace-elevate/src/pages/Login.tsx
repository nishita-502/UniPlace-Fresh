import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, GraduationCap, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({ title: "Welcome back!", description: "Logged in successfully." });
        // App.tsx handles redirect
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* --- LEFT SIDE (Green with Image) --- */}
      <div className="hidden lg:flex flex-col bg-[#113a2f] text-white p-8 justify-between relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-white/5 opacity-20 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>

        {/* Logo Section */}
        <div className="relative z-10 flex items-center gap-3 text-2xl font-bold">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <GraduationCap className="w-8 h-8" />
          </div>
          UniPlace
        </div>

        {/* Hero Image Section */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-12">
          {/* Main Hero Image */}
          <img
            src="/login-hero.png"
            alt="Dashboard Preview"
            className="w-full max-w-lg rounded-xl shadow-2xl border border-white/10 object-cover"
          />

          {/* Text Below Image */}
          <div className="mt-8 text-center space-y-2">
            <h1 className="text-3xl font-bold">Placement Admin Dashboard</h1>
            <p className="text-green-100/80 max-w-sm mx-auto">
              Streamline your entire placement process with our unified management system.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-green-200/50 text-center">
          © 2026 UniPlace Inc. All rights reserved.
        </div>
      </div>

      {/* --- RIGHT SIDE (Login Form) --- */}
      <div className="flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-muted-foreground">Enter your credentials to access the dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email" type="email" placeholder="admin@igdtuw.ac.in"
                  className="pl-10 h-11" value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="password" type="password" placeholder="••••••••"
                  className="pl-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-[#113a2f] hover:bg-[#0d2e25]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}