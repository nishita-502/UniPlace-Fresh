import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap, Briefcase, UserCheck, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type UIStudent = {
  id: string;
  name: string;
  rollNo: string;
  branch: string;
  course: string;
  batch: number;
  cgpa: string;
  status: string;
  company: string;
  type: string;
};

export default function StudentsDatabase() {
  const { toast } = useToast();
  const [students, setStudents] = useState<UIStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch Students
        const { data: studentsData, error: sErr } = await supabase.from("students_data").select("*");
        if (sErr) throw sErr;

        // 2. Fetch Results
        const { data: resultsData, error: rErr } = await supabase
          .from("results")
          .select(`student_id, status, drives (company_name, employment_type)`);
        if (rErr) throw rErr;

        // 3. Map Results (Priority: Selected > Shortlisted)
        const statusMap: Record<string, { status: string; company: string; type: string }> = {};

        resultsData?.forEach((r: any) => {
          const id = r.student_id;

          // If this student is already marked 'Selected', don't overwrite with 'Shortlisted'
          if (statusMap[id]?.status === "Selected") return;

          statusMap[id] = {
            status: r.status, // "Selected" or "Shortlisted"
            company: r.drives?.company_name || "-",
            type: r.drives?.employment_type || "FTE" // Default to FTE if missing
          };
        });

        // 4. Merge Data
        const mapped: UIStudent[] = (studentsData || []).map((s: any) => {
          const res = statusMap[s.enrollment_number] || { status: "Unplaced", company: "-", type: "-" };
          return {
            id: s.enrollment_number,
            name: s.name,
            rollNo: s.enrollment_number,
            branch: s.branch || "-",
            course: s.course || "B.Tech",
            batch: s.passing_year || 2026,
            cgpa: s.cgpa || "0.0",
            status: res.status,
            company: res.company,
            type: res.type
          };
        });

        setStudents(mapped);

      } catch (err: any) {
        toast({ title: "Error", description: "Failed to load data." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // --- Filter Logic ---
  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.includes(search);
    const matchBranch = branchFilter === "all" || s.branch === branchFilter;
    const matchBatch = batchFilter === "all" || s.batch.toString() === batchFilter;
    return matchSearch && matchBranch && matchBatch;
  });

  // --- Stats Calculation ---
  const total = filtered.length;
  // Count EVERYONE who is Selected (Total Selections)
  const totalSelections = filtered.filter(s => s.status === "Selected").length;
  // Specific Counts
  const placedFTE = filtered.filter(s => s.status === "Selected" && s.type === "FTE").length;
  const interns = filtered.filter(s => s.status === "Selected" && s.type === "Intern").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Students Database</h1>
        <p className="page-subtitle">View records by Course, Branch & Batch</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="stat-card flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><GraduationCap className="w-5 h-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
        </div>

        {/* Total Selections (The 18 Number) */}
        <div className="stat-card flex items-center gap-3 border-green-200 bg-green-50/50">
          <div className="p-2 bg-green-100 rounded-lg"><Trophy className="w-5 h-5 text-green-700" /></div>
          <div><p className="text-2xl font-bold text-green-700">{totalSelections}</p><p className="text-xs text-green-600 font-medium">Total Selections</p></div>
        </div>

        {/* FTE Breakdown */}
        <div className="stat-card flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{placedFTE}</p><p className="text-xs text-muted-foreground">FTE Offers</p></div>
        </div>

        {/* Intern Breakdown */}
        <div className="stat-card flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><UserCheck className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold">{interns}</p><p className="text-xs text-muted-foreground">Internships</p></div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name or roll no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
            <SelectItem value="2028">2028</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            <SelectItem value="CSE">CSE</SelectItem>
            <SelectItem value="CSE-AI">CSE-AI</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="ECE">ECE</SelectItem>
            <SelectItem value="MAE">MAE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="data-table overflow-x-auto border rounded-md">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Batch</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.rollNo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.course} {s.batch}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.branch}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${s.status === "Selected" ? "bg-green-100 text-green-700 border-green-200" :
                          s.status === "Shortlisted" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                        }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{s.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {s.status === "Selected" ? s.type : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No students found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}