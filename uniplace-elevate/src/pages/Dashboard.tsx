import { useEffect, useState } from "react";
import {
  Building2, Briefcase, GraduationCap, Users, UserX, Clock, Plus, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#94a3b8"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // --- State ---
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCompanies: 0,
    activeJobPostings: 0,
    studentsPlaced: 0,
    studentsUnplaced: 0,
    internCount: 0,
  });

  const [branchData, setBranchData] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch Raw Data
        console.log("Fetching Dashboard Data...");

        const [
          { data: students, error: studentError },
          { count: companyCount, error: companyError },
          { count: driveCount, error: driveError },
          { data: results, error: resultError }
        ] = await Promise.all([
          supabase.from("students_data").select("enrollment_number, branch"),
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("drives").select("*", { count: "exact", head: true }),
          // Fetch ALL results (we will filter in JS to be safe)
          supabase.from("results").select(`
            student_id,
            status,
            drives (company_name, employment_type)
          `)
        ]);

        if (studentError) throw studentError;
        if (companyError) throw companyError;
        if (driveError) throw driveError;
        if (resultError) throw resultError;

        console.log("Raw Students:", students);
        console.log("Raw Results:", results);

        const totalStudents = students?.length || 0;
        const totalCompanies = companyCount || 0;
        const activeJobPostings = driveCount || 0;

        // 2. Process Results (Robust Filtering)
        const placedStudents = new Set();
        const internStudents = new Set();
        const companyHires: Record<string, number> = {};

        results?.forEach((r: any) => {
          // Normalize status to handle case sensitivity or spaces
          const status = r.status?.trim().toLowerCase();

          // Only process if status is 'selected'
          if (status === "selected") {
            const driveData = r.drives; // Handle case where join returns null
            const type = driveData?.employment_type?.trim(); // "FTE" or "Intern"
            const company = driveData?.company_name || "Unknown";
            const studentId = r.student_id;

            // Count Company Hires
            companyHires[company] = (companyHires[company] || 0) + 1;

            // Count Student Types (Set prevents duplicates)
            if (type === "Intern") {
              internStudents.add(studentId);
            } else {
              // Default to FTE for anything else
              placedStudents.add(studentId);
            }
          }
        });

        const placedCount = placedStudents.size;
        const internCount = internStudents.size;
        const unplacedCount = Math.max(0, totalStudents - placedCount);

        // 3. Process Branch Data
        const branchStats: Record<string, { total: number; placed: number }> = {};

        // Initialize all branches found in students_data
        students?.forEach((s: any) => {
          const b = s.branch?.trim() || "Unknown";
          if (!branchStats[b]) branchStats[b] = { total: 0, placed: 0 };
          branchStats[b].total++;
        });

        // Add placed counts
        students?.forEach((s: any) => {
          if (placedStudents.has(s.enrollment_number)) {
            const b = s.branch?.trim() || "Unknown";
            if (branchStats[b]) branchStats[b].placed++;
          }
        });

        const formattedBranchData = Object.keys(branchStats).map(branch => ({
          branch,
          total: branchStats[branch].total,
          placed: branchStats[branch].placed
        }));

        console.log("Processed Branch Data:", formattedBranchData);

        // 4. Process Company Data (Pie Chart)
        const sortedCompanies = Object.keys(companyHires)
          .map(company => ({ name: company, value: companyHires[company] }))
          .sort((a, b) => b.value - a.value);

        // Top 5 + Others
        const topCompanies = sortedCompanies.slice(0, 5);
        const remaining = sortedCompanies.slice(5);
        if (remaining.length > 0) {
          const othersCount = remaining.reduce((sum, item) => sum + item.value, 0);
          topCompanies.push({ name: "Others", value: othersCount });
        }

        console.log("Processed Company Data:", topCompanies);

        // 5. Update State
        setStats({
          totalStudents,
          totalCompanies,
          activeJobPostings,
          studentsPlaced: placedCount,
          studentsUnplaced: unplacedCount,
          internCount,
        });

        setBranchData(formattedBranchData);
        setCompanyData(topCompanies);

      } catch (error: any) {
        console.error("Dashboard Error:", error);
        toast({ title: "Data Error", description: error.message || "Failed to load stats." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // --- UI Components ---
  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="stat-card p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="page-header text-3xl font-bold">Dashboard</h1>
        <p className="page-subtitle mt-1 text-muted-foreground">Placement Season 2026 Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={GraduationCap} color="text-primary" />
        <StatCard label="Total Companies" value={stats.totalCompanies} icon={Building2} color="text-blue-500" />
        <StatCard label="Job Postings" value={stats.activeJobPostings} icon={Briefcase} color="text-orange-500" />
        <StatCard label="Placed (FTE)" value={stats.studentsPlaced} icon={Users} color="text-green-600" />
        <StatCard label="Unplaced" value={stats.studentsUnplaced} icon={UserX} color="text-red-500" />
        <StatCard label="Interns" value={stats.internCount} icon={Clock} color="text-purple-600" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/companies")} className="gap-2"><Plus className="w-4 h-4" /> Add Company</Button>
        <Button onClick={() => navigate("/job-postings")} className="gap-2"><Plus className="w-4 h-4" /> Add Job Posting</Button>
        <Button onClick={() => navigate("/events")} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Add Event</Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Branch-wise Placement */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Placement by Branch</h3>
          <div className="h-[300px] w-full">
            {branchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="placed" fill="#16a34a" radius={[4, 4, 0, 0]} name="Placed" />
                  <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total Students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No student data available
              </div>
            )}
          </div>
        </div>

        {/* Company-wise Hiring */}
        <div className="p-6 border rounded-lg bg-card shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Hiring Companies</h3>
          <div className="h-[300px] w-full">
            {companyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {companyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No placement data available
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}