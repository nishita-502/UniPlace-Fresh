import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

const exportOptions = [
  { id: "students", title: "Complete Student Database", description: "All students with details", icon: FileSpreadsheet },
  { id: "applicants", title: "Job-wise Applicant Data", description: "Applicants grouped by job", icon: FileSpreadsheet },
  { id: "placed", title: "Placed/Shortlisted Students", description: "All selected & shortlisted students", icon: FileSpreadsheet }, // Updated Title
  { id: "company_results", title: "Company-wise Results", description: "Hiring results per company", icon: FileSpreadsheet },
  { id: "branch_stats", title: "Branch-wise Statistics", description: "Placement stats by branch", icon: FileSpreadsheet },
  { id: "intern_ppo", title: "PPO & Intern Report", description: "Internship & PPO data", icon: FileSpreadsheet },
];

export default function ReportsExports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const fetchReportData = async (reportId: string) => {
    try {
      let data: any[] = [];
      let fileName = "report";

      switch (reportId) {
        case "students": {
          fileName = "Student_Database";
          const { data: students, error } = await supabase.from("students_data").select("*");
          if (error) throw error;
          data = students;
          break;
        }

        case "placed": {
          fileName = "Placed_Students_List";
          // FIX: Now checking for both "Selected" AND "Shortlisted"
          const { data: results, error } = await supabase
            .from("results")
            .select(`
              status,
              students_data (enrollment_number, name, branch, primary_email),
              drives (company_name, job_title, employment_type)
            `)
            .in("status", ["Selected", "Shortlisted"]); // <--- UPDATED FILTER

          if (error) throw error;

          data = results.map((r: any) => ({
            "Student Name": r.students_data?.name,
            "Enrollment No": r.students_data?.enrollment_number,
            "Branch": r.students_data?.branch,
            "Company": r.drives?.company_name,
            "Job Role": r.drives?.job_title,
            "Type": r.drives?.employment_type,
            "Status": r.status,
          }));
          break;
        }

        case "applicants":
        case "company_results": {
          fileName = reportId === "applicants" ? "Job_Applicants" : "Company_Results";
          const { data: results, error } = await supabase
            .from("results")
            .select(`
              status,
              students_data (enrollment_number, name, branch, cgpa),
              drives (company_name, job_title)
            `);

          if (error) throw error;

          data = results.map((r: any) => ({
            "Company": r.drives?.company_name,
            "Job Title": r.drives?.job_title,
            "Student Name": r.students_data?.name,
            "Branch": r.students_data?.branch,
            "CGPA": r.students_data?.cgpa,
            "Status": r.status,
          }));

          data.sort((a, b) => a.Company.localeCompare(b.Company));
          break;
        }

        case "branch_stats": {
          fileName = "Branch_Statistics";
          // 1. Get all students
          const { data: students, error: sErr } = await supabase.from("students_data").select("branch");
          if (sErr) throw sErr;

          // 2. Get "Placed" (Selected OR Shortlisted) students
          // FIX: Now counting "Shortlisted" as placed for the sake of statistics
          const { data: placed, error: pErr } = await supabase
            .from("results")
            .select("students_data(branch)")
            .in("status", ["Selected", "Shortlisted"]); // <--- UPDATED FILTER
          if (pErr) throw pErr;

          const branchMap: Record<string, { total: number; placed: number }> = {};

          students?.forEach((s: any) => {
            const b = s.branch || "Unknown";
            if (!branchMap[b]) branchMap[b] = { total: 0, placed: 0 };
            branchMap[b].total++;
          });

          placed?.forEach((p: any) => {
            const b = p.students_data?.branch || "Unknown";
            if (branchMap[b]) branchMap[b].placed++;
          });

          data = Object.keys(branchMap).map(branch => ({
            "Branch": branch,
            "Total Students": branchMap[branch].total,
            "Placed/Shortlisted": branchMap[branch].placed,
            "Percentage": ((branchMap[branch].placed / branchMap[branch].total) * 100).toFixed(2) + "%"
          }));
          break;
        }

        case "intern_ppo": {
          fileName = "Intern_PPO_Report";
          const { data: results, error } = await supabase
            .from("results")
            .select(`
              status,
              students_data (name, branch),
              drives (company_name, job_title, employment_type)
            `)
            // Only fetching results that are Intern or PPO
            .in("drives.employment_type", ["Intern", "PPO"]);

          if (error) throw error;

          // Extra safety filter
          const filtered = results.filter((r: any) =>
            r.drives?.employment_type === 'Intern' || r.drives?.employment_type === 'PPO'
          );

          data = filtered.map((r: any) => ({
            "Student": r.students_data?.name,
            "Branch": r.students_data?.branch,
            "Company": r.drives?.company_name,
            "Role": r.drives?.job_title,
            "Type": r.drives?.employment_type,
            "Status": r.status
          }));
          break;
        }
      }

      if (data.length === 0) {
        toast({ title: "No Data Found", description: "There is no data available for this report.", variant: "destructive" });
        return null;
      }

      return { data, fileName };

    } catch (error: any) {
      console.error(error);
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const handleDownload = async (reportId: string, format: "xlsx" | "csv") => {
    setLoading(reportId);

    const report = await fetchReportData(reportId);

    if (report) {
      const { data, fileName } = report;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      if (format === "xlsx") {
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
      } else {
        XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: "csv" });
      }

      toast({ title: "Download Started", description: `Exporting ${fileName}.${format}` });
    }

    setLoading(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Reports & Exports</h1>
      <p className="page-subtitle">Download placement data and reports</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map(opt => (
          <div key={opt.id} className="stat-card">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <opt.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">{opt.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 flex-1"
                onClick={() => handleDownload(opt.id, "xlsx")}
                disabled={loading === opt.id}
              >
                {loading === opt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 flex-1"
                onClick={() => handleDownload(opt.id, "csv")}
                disabled={loading === opt.id}
              >
                {loading === opt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                CSV
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}