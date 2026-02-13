import { useEffect, useState } from "react";
import { mockResults } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Upload, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

type StudentRecord = {
  enrollment_number: string;
  name?: string | null;
  primary_email?: string | null;
  secondary_email?: string | null;
};

export default function Results() {
  const [results, setResults] = useState(mockResults);
  const { toast } = useToast();

  // Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batch, setBatch] = useState("2026");
  const [resultType, setResultType] = useState<"OA" | "Final Offer">("OA");
  const [employmentType, setEmploymentType] = useState<"Intern" | "FTE">("Intern");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email State
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [targetEmails, setTargetEmails] = useState<string[]>([]);
  const [targetGroupLabel, setTargetGroupLabel] = useState("");

  // Load persisted results from Supabase on mount
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);

        const { data: resultRows, error: resultsError } = await supabase
          .from("results")
          .select("id, drive_id, student_id, status");

        if (resultsError) {
          console.error(resultsError);
          throw resultsError;
        }

        if (!resultRows || resultRows.length === 0) return;

        const driveIds = Array.from(new Set(resultRows.map((r: any) => r.drive_id).filter(Boolean)));
        const studentIds = Array.from(new Set(resultRows.map((r: any) => r.student_id).filter(Boolean)));

        const [drivesRes, studentsRes] = await Promise.all([
          driveIds.length
            ? supabase.from("drives").select("id, company_name, job_title").in("id", driveIds)
            : Promise.resolve({ data: [], error: null } as any),
          studentIds.length
            ? supabase.from("students_data").select("enrollment_number, name").in("enrollment_number", studentIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (drivesRes.error || studentsRes.error) throw drivesRes.error || studentsRes.error;

        const drives = drivesRes.data ?? [];
        const students = studentsRes.data ?? [];

        const driveById = new Map();
        drives.forEach((d: any) => driveById.set(d.id, d));

        const studentByEnrollment = new Map();
        students.forEach((s: any) => studentByEnrollment.set(s.enrollment_number, s));

        const mappedResults = resultRows.map((r: any) => {
          const drive = driveById.get(r.drive_id);
          const student = studentByEnrollment.get(r.student_id);

          // FIX: Determine status based on DB 'status' column
          const isSelected = r.status === "Selected";

          return {
            id: r.id?.toString() ?? `result-${r.drive_id}-${r.student_id}`,
            studentName: (student?.name ?? r.student_id).toString(),
            rollNo: r.student_id.toString(),
            job: drive ? `${drive.job_title} - ${drive.company_name}` : "",

            // Logic: If "Selected" in DB -> Final Offer. Else -> Shortlisted/OA.
            oaStatus: "Cleared",
            interviewStatus: isSelected ? "Cleared" : "Pending",
            finalStatus: isSelected ? "Selected" : "Pending"
          };
        });

        if (mappedResults.length) setResults(mappedResults);
      } catch (error) {
        console.error(error);
        toast({ title: "Failed to load results", description: "Could not load placement results.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, []);

  // --- CSV Upload Logic ---
  const parseCsvFile = (csvFile: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => results.errors?.length ? reject(results.errors[0]) : resolve(results.data as any[]),
        error: reject,
      });
    });

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return toast({ title: "No file selected", variant: "destructive" });

    try {
      setIsUploading(true);
      const parsedRows = await parseCsvFile(file);
      if (!parsedRows.length) throw new Error("Uploaded CSV does not contain any rows.");

      // 1. Create Drive
      const { data: driveInsert, error: driveError } = await supabase
        .from("drives")
        .insert({
          company_name: companyName,
          job_title: jobTitle,
          employment_type: employmentType
        })
        .select("id")
        .single();

      if (driveError || !driveInsert) throw driveError ?? new Error("Failed to create drive entry.");
      const driveId = driveInsert.id;

      // 2. Process Emails
      const extractEmail = (row: any) => {
        const raw = row.email ?? row.Email ?? row.primary_email ?? row.PRIMARY_EMAIL;
        return raw ? String(raw).trim().toLowerCase() : null;
      };
      const allEmails = [...new Set(parsedRows.map(extractEmail).filter((e): e is string => !!e))];
      if (!allEmails.length) throw new Error("No valid email column found in CSV.");

      // 3. Fetch Students
      const { data: primaryMatches } = await supabase.from("students_data").select("*").in("primary_email", allEmails);
      const { data: secondaryMatches } = await supabase.from("students_data").select("*").in("secondary_email", allEmails);

      const emailToStudent = new Map<string, StudentRecord>();
      [...(primaryMatches ?? []), ...(secondaryMatches ?? [])].forEach(s => {
        if (s.primary_email) emailToStudent.set(s.primary_email.toLowerCase(), s);
        if (s.secondary_email) emailToStudent.set(s.secondary_email.toLowerCase(), s);
      });

      const resultRowsForDb: any[] = [];
      const uiRows: any[] = [];
      const seenEmails = new Set<string>();

      // Determine DB Status based on User Selection
      const dbStatus = resultType === "Final Offer" ? "Selected" : "Shortlisted";

      parsedRows.forEach((row) => {
        const email = extractEmail(row);
        if (!email || seenEmails.has(email)) return;
        seenEmails.add(email);

        const student = emailToStudent.get(email);
        if (!student) return;

        resultRowsForDb.push({ drive_id: driveId, student_id: student.enrollment_number, status: dbStatus });

        uiRows.push({
          id: `drive-${driveId}-${student.enrollment_number}`,
          studentName: student.name,
          rollNo: student.enrollment_number,
          job: `${jobTitle} - ${companyName}`,
          oaStatus: "Cleared",
          interviewStatus: resultType === "Final Offer" ? "Cleared" : "Pending",
          finalStatus: resultType === "Final Offer" ? "Selected" : "Pending",
        });
      });

      if (!resultRowsForDb.length) throw new Error("No matching students found.");

      const { error: insertError } = await supabase.from("results").insert(resultRowsForDb);
      if (insertError) throw insertError;

      setResults((prev) => [...uiRows, ...prev]);
      toast({ title: "Upload successful", description: `Added ${resultRowsForDb.length} records.` });
      setIsUploadOpen(false);
      setFile(null);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Email Logic ---
  const initiateEmailSequence = async (group: "all" | "oa" | "selected") => {
    setIsLoading(true);
    let enrollmentNumbers: string[] = [];
    let label = "";

    if (group === "all") {
      enrollmentNumbers = results.map(r => r.rollNo);
      label = "Eligible Students";
    } else if (group === "oa") {
      enrollmentNumbers = results
        .filter(r => r.finalStatus !== "Selected") // Shortlisted only
        .map(r => r.rollNo);
      label = "OA Qualified Students";
    } else if (group === "selected") {
      enrollmentNumbers = results
        .filter(r => r.finalStatus === "Selected")
        .map(r => r.rollNo);
      label = "Selected Students";
    }

    if (enrollmentNumbers.length === 0) {
      toast({ title: "No students found", description: "No students match this category.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("students_data")
      .select("primary_email")
      .in("enrollment_number", enrollmentNumbers);

    setIsLoading(false);

    if (error || !data) {
      toast({ title: "Error", description: "Could not fetch student emails.", variant: "destructive" });
      return;
    }

    const emails = data.map(d => d.primary_email).filter(e => e) as string[];
    setTargetEmails(emails);
    setTargetGroupLabel(label);
    setEmailSubject(group === "oa" ? "Update: OA Results Announced" : group === "selected" ? "Congratulations! Selection Update" : "Update: Recruitment Drive Results");
    setIsEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) {
      toast({ title: "Missing fields", description: "Please provide a subject and body.", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmails,
          subject: emailSubject,
          body: emailBody
        })
      });

      if (!response.ok) throw new Error("Failed to send");

      toast({ title: "Emails Sent!", description: `Successfully sent to ${targetEmails.length} students.` });
      setIsEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
    } catch (error) {
      console.error(error);
      toast({ title: "Sending Failed", description: "Is your local server running?", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  // --- Render Helpers ---
  const oaResults = results.filter((r) => r.finalStatus !== "Selected");
  const finalOffers = results.filter((r) => r.finalStatus === "Selected");

  const getStatusBadge = (status: string) => {
    if (status === "Cleared" || status === "Selected") return "badge-approved";
    return "badge-pending";
  };

  const ResultTable = ({ data }: { data: typeof results }) => (
    <div className="data-table">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["Student", "Roll No", "Job", "OA", "Interview", "Final"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? data.map(r => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium text-foreground">{r.studentName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.rollNo}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.job}</td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.oaStatus)}>{r.oaStatus}</span></td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.interviewStatus)}>{r.interviewStatus}</span></td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.finalStatus)}>{r.finalStatus}</span></td>
            </tr>
          )) : (
            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No records found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Results</h1>
          <p className="page-subtitle">Manage OA, interview, and final offer results</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <Button variant="outline" className="gap-2" onClick={() => setIsUploadOpen(true)}>
            <Upload className="w-4 h-4" /> Upload CSV
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload results CSV</DialogTitle>
              <DialogDescription>
                Headers must contain <strong>email</strong>. Matches students in database.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Job title</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Batch</Label>
                  <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="2026" required />
                </div>
                <div className="space-y-2">
                  <Label>Result Type</Label>
                  <Select value={resultType} onValueChange={(v: any) => setResultType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OA">OA / Shortlist</SelectItem>
                      <SelectItem value="Final Offer">Final Offer (Selection)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment</Label>
                  <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="FTE">FTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>CSV file</Label>
                <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUploading || !file}>{isUploading ? "Uploading..." : "Upload"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => initiateEmailSequence("all")}>
          <Mail className="w-4 h-4" /> Email Eligible
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => initiateEmailSequence("oa")}>
          <Mail className="w-4 h-4" /> Email OA Qualified
        </Button>
        <Button size="sm" className="gap-2" onClick={() => initiateEmailSequence("selected")}>
          <Mail className="w-4 h-4" /> Email Selected
        </Button>
      </div>

      <Tabs defaultValue="oa">
        <TabsList>
          <TabsTrigger value="oa">OA Results</TabsTrigger>
          <TabsTrigger value="offers">Final Offers</TabsTrigger>
        </TabsList>
        <TabsContent value="oa" className="mt-4"><ResultTable data={oaResults} /></TabsContent>
        <TabsContent value="offers" className="mt-4"><ResultTable data={finalOffers} /></TabsContent>
      </Tabs>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Email to {targetGroupLabel}</DialogTitle>
            <DialogDescription>
              Sending to <strong>{targetEmails.length}</strong> students.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Message</Label>
              <Textarea id="body" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}