import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Eye, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function EmailCenter() {
  const { toast } = useToast();

  // Form State
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedJob, setSelectedJob] = useState("");

  // Data State
  const [branches, setBranches] = useState<string[]>([]);
  const [jobs, setJobs] = useState<{ id: number; title: string }[]>([]);
  const [calculatedRecipients, setCalculatedRecipients] = useState<string[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // 1. Fetch Filters (Branches & Jobs) on Load
  useEffect(() => {
    const fetchFilters = async () => {
      // Get unique branches
      const { data: students } = await supabase.from("students_data").select("branch");
      if (students) {
        const uniqueBranches = Array.from(new Set(students.map((s: any) => s.branch).filter(Boolean)));
        setBranches(uniqueBranches as string[]);
      }

      // Get active jobs
      const { data: drives } = await supabase.from("drives").select("id, company_name, job_title");
      if (drives) {
        setJobs(drives.map((d: any) => ({
          id: d.id,
          title: `${d.company_name} - ${d.job_title}`,
        })));
      }
    };
    fetchFilters();
  }, []);

  // 2. Calculate Recipients whenever filters change
  useEffect(() => {
    const calculateRecipients = async () => {
      setIsCalculating(true);
      setCalculatedRecipients([]);

      try {
        let emails: string[] = [];

        if (recipientType === "all") {
          const { data } = await supabase.from("students_data").select("primary_email");
          emails = data?.map((s: any) => s.primary_email) || [];
        }
        else if (recipientType === "branch" && selectedBranch) {
          const { data } = await supabase
            .from("students_data")
            .select("primary_email")
            .eq("branch", selectedBranch);
          emails = data?.map((s: any) => s.primary_email) || [];
        }
        else if (recipientType === "job" && selectedJob) {
          // Fetch students who applied/are part of this drive results
          const { data } = await supabase
            .from("results")
            .select("student_id")
            .eq("drive_id", selectedJob);

          const studentIds = data?.map((r: any) => r.student_id) || [];

          if (studentIds.length > 0) {
            const { data: studentData } = await supabase
              .from("students_data")
              .select("primary_email")
              .in("enrollment_number", studentIds);
            emails = studentData?.map((s: any) => s.primary_email) || [];
          }
        }
        else if (recipientType === "placed") {
          // Get IDs of placed students
          const { data: results } = await supabase
            .from("results")
            .select("student_id")
            .eq("status", "Selected");

          const placedIds = results?.map((r: any) => r.student_id) || [];

          if (placedIds.length > 0) {
            const { data: studentData } = await supabase
              .from("students_data")
              .select("primary_email")
              .in("enrollment_number", placedIds);
            emails = studentData?.map((s: any) => s.primary_email) || [];
          }
        }
        else if (recipientType === "unplaced") {
          // Get all students
          const { data: allStudents } = await supabase.from("students_data").select("enrollment_number, primary_email");
          // Get placed IDs
          const { data: results } = await supabase.from("results").select("student_id").eq("status", "Selected");
          const placedIds = new Set(results?.map((r: any) => r.student_id));

          // Filter
          emails = allStudents
            ?.filter((s: any) => !placedIds.has(s.enrollment_number))
            .map((s: any) => s.primary_email) || [];
        }

        // Filter out nulls/empties
        setCalculatedRecipients(emails.filter(e => e && e.includes("@")));

      } catch (error) {
        console.error("Error calculating recipients:", error);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateRecipients();
  }, [recipientType, selectedBranch, selectedJob]);

  // 3. Send Email Handler
  const handleSend = async () => {
    if (!subject || !body) return toast({ title: "Missing fields", description: "Subject and Body are required", variant: "destructive" });
    if (calculatedRecipients.length === 0) return toast({ title: "No Recipients", description: "Selected criteria matches 0 students.", variant: "destructive" });

    setIsSending(true);
    try {
      // Send to local Node.js server
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: calculatedRecipients,
          subject: subject,
          body: body,
        }),
      });

      if (!response.ok) throw new Error("Failed to send emails via server");

      toast({
        title: "Emails Sent Successfully",
        description: `Delivered to ${calculatedRecipients.length} students.`
      });

      // Reset Form
      setSubject("");
      setBody("");
      setPreviewMode(false);

    } catch (error) {
      console.error(error);
      toast({ title: "Sending Failed", description: "Ensure the local email server is running.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Email Center</h1>
      <p className="page-subtitle">Send targeted emails to students</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Compose */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Compose Email
          </h3>

          {/* Recipient Logic */}
          <div className="space-y-3">
            <Label>Recipient Group</Label>
            <Select value={recipientType} onValueChange={setRecipientType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="branch">By Branch</SelectItem>
                <SelectItem value="job">By Job Applicants</SelectItem>
                <SelectItem value="placed">Placed Students</SelectItem>
                <SelectItem value="unplaced">Unplaced Students</SelectItem>
              </SelectContent>
            </Select>

            {/* Conditional Sub-Selects */}
            {recipientType === "branch" && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger><SelectValue placeholder="Select Branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {recipientType === "job" && (
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger><SelectValue placeholder="Select Company / Job" /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id.toString()}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Live Recipient Counter */}
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2 bg-muted p-2 rounded">
              <Users className="w-4 h-4" />
              {isCalculating ? (
                <span>Calculating recipients...</span>
              ) : (
                <span>Targeting <strong>{calculatedRecipients.length}</strong> students</span>
              )}
            </div>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="mt-1"
              placeholder="e.g. Important Update Regarding..."
            />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="mt-1 min-h-[200px]"
              placeholder="Write your message here..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="gap-2 flex-1" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="w-4 h-4" /> {previewMode ? "Hide Preview" : "Preview Email"}
            </Button>
            <Button className="gap-2 flex-1" onClick={handleSend} disabled={isSending || isCalculating || calculatedRecipients.length === 0}>
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="stat-card h-fit">
          <h3 className="text-lg font-semibold text-foreground mb-4">Preview</h3>
          {previewMode && subject ? (
            <div className="space-y-4 animate-fade-in">
              <div className="border border-border rounded-lg p-4 bg-background">
                <div className="border-b border-border pb-3 mb-3 space-y-1">
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">To:</span> {recipientType.toUpperCase()} ({calculatedRecipients.length} recipients)</p>
                  <p className="text-sm text-muted-foreground"><span className="font-semibold">Subject:</span> {subject}</p>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {body || <span className="text-muted-foreground italic">No content yet...</span>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                This is how the email will appear to students.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed border-muted rounded-lg">
              <Eye className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Enter subject and click Preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
