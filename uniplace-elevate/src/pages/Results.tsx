import { useEffect, useState } from "react";
import { mockResults } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Upload } from "lucide-react";
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batch, setBatch] = useState("2026");
  const [resultType, setResultType] = useState<"OA" | "Final Offer">("OA");
  const [employmentType, setEmploymentType] = useState<"Intern" | "FTE">(
    "Intern",
  );
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted results from Supabase on mount
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);

        const {
          data: resultRows,
          error: resultsError,
        } = await supabase
          .from("results")
          .select("id, drive_id, student_id, status");

        if (resultsError) {
          console.error(resultsError);
          throw resultsError;
        }

        if (!resultRows || resultRows.length === 0) {
          return;
        }

        const driveIds = Array.from(
          new Set(
            resultRows
              .map((r: any) => r.drive_id)
              .filter((id: any) => id !== null && id !== undefined),
          ),
        );
        const studentIds = Array.from(
          new Set(
            resultRows
              .map((r: any) => r.student_id)
              .filter((id: any) => id !== null && id !== undefined),
          ),
        );

        const [drivesRes, studentsRes] = await Promise.all([
          driveIds.length
            ? supabase
                .from("drives")
                .select("id, company_name, job_title, result_type")
                .in("id", driveIds)
            : Promise.resolve({ data: [], error: null } as any),
          studentIds.length
            ? supabase
                .from("students_data")
                .select("enrollment_number, name")
                .in("enrollment_number", studentIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        if (drivesRes.error || studentsRes.error) {
          console.error(drivesRes.error || studentsRes.error);
          throw drivesRes.error || studentsRes.error;
        }

        const drives = drivesRes.data ?? [];
        const students = studentsRes.data ?? [];

        const driveById = new Map<
          string | number,
          { id: string | number; company_name: string; job_title: string; result_type?: string }
        >();
        drives.forEach((d: any) => {
          driveById.set(d.id, d);
        });

        const studentByEnrollment = new Map<
          string,
          { enrollment_number: string; name?: string | null }
        >();
        students.forEach((s: any) => {
          studentByEnrollment.set(s.enrollment_number, s);
        });

        const mappedResults = resultRows.map((r: any) => {
          const drive = driveById.get(r.drive_id);
          const student = studentByEnrollment.get(r.student_id);

          const resultTypeFromDrive = (drive?.result_type as
            | "OA"
            | "Final Offer"
            | undefined) ?? "OA";

          const base = {
            id: r.id?.toString() ?? `result-${r.drive_id}-${r.student_id}`,
            studentName: (student?.name ?? r.student_id).toString(),
            rollNo: r.student_id.toString(),
            job: drive
              ? `${drive.job_title} - ${drive.company_name}`
              : "",
          };

          if (resultTypeFromDrive === "Final Offer") {
            return {
              ...base,
              oaStatus: "Cleared",
              interviewStatus: "Cleared",
              finalStatus: "Selected",
            };
          }

          return {
            ...base,
            oaStatus: "Cleared",
            interviewStatus: "Pending",
            finalStatus: "Pending",
          };
        });

        if (mappedResults.length) {
          setResults(mappedResults);
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Failed to load results",
          description:
            "Could not load placement results from Supabase. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parseCsvFile = (csvFile: File): Promise<any[]> =>
    new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors?.length) {
            reject(results.errors[0]);
          } else {
            resolve(results.data as any[]);
          }
        },
        error: reject,
      });
    });

  const handleUploadSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please choose a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);

      const parsedRows = await parseCsvFile(file);

      if (!parsedRows.length) {
        throw new Error("Uploaded CSV does not contain any rows.");
      }

      // 1) Create a drive entry for this upload
      const { data: driveInsert, error: driveError } = await supabase
        .from("drives")
        .insert({
          company_name: companyName,
          job_title: jobTitle,
          batch,
          result_type: resultType,
          employment_type: employmentType,
          description,
        })
        .select("id")
        .single();

      if (driveError || !driveInsert) {
        console.error(driveError);
        throw driveError ?? new Error("Failed to create drive entry.");
      }

      const driveId: string | number = driveInsert.id;

      // 2) Collect all emails from CSV
      const extractEmail = (row: any): string | null => {
        const raw =
          row.email ??
          row.Email ??
          row.primary_email ??
          row.PRIMARY_EMAIL ??
          null;

        if (!raw) return null;
        const email = String(raw).trim().toLowerCase();
        return email || null;
      };

      const allEmails = parsedRows
        .map(extractEmail)
        .filter((e): e is string => !!e);

      if (!allEmails.length) {
        throw new Error(
          "No valid email column found in CSV. Expected a column like 'email' or 'primary_email'.",
        );
      }

      const uniqueEmails = Array.from(new Set(allEmails));

      // 3) Fetch matching students from students_data using primary_email and secondary_email
      const {
        data: primaryMatches,
        error: primaryError,
      } = await supabase
        .from("students_data")
        .select(
          "enrollment_number, name, primary_email, secondary_email",
        )
        .in("primary_email", uniqueEmails);

      if (primaryError) {
        console.error(primaryError);
        throw primaryError;
      }

      const {
        data: secondaryMatches,
        error: secondaryError,
      } = await supabase
        .from("students_data")
        .select(
          "enrollment_number, name, primary_email, secondary_email",
        )
        .in("secondary_email", uniqueEmails);

      if (secondaryError) {
        console.error(secondaryError);
        throw secondaryError;
      }

      const emailToStudent = new Map<string, StudentRecord>();
      const addStudentToMap = (student: StudentRecord) => {
        const primary = student.primary_email?.toLowerCase() ?? "";
        const secondary = student.secondary_email?.toLowerCase() ?? "";
        if (primary && !emailToStudent.has(primary)) {
          emailToStudent.set(primary, student);
        }
        if (secondary && !emailToStudent.has(secondary)) {
          emailToStudent.set(secondary, student);
        }
      };

      (primaryMatches ?? []).forEach(addStudentToMap);
      (secondaryMatches ?? []).forEach(addStudentToMap);

      const resultRowsForDb: {
        drive_id: string | number;
        student_id: string;
        status: string;
      }[] = [];
      const uiRows: typeof results = [];
      const notFoundEmails = new Set<string>();
      const seenEmails = new Set<string>();

      parsedRows.forEach((row) => {
        const email = extractEmail(row);
        if (!email || seenEmails.has(email)) return;
        seenEmails.add(email);

        const student = emailToStudent.get(email);
        if (!student) {
          notFoundEmails.add(email);
          return;
        }

        // Build row for results table
        resultRowsForDb.push({
          drive_id: driveId,
          // Assuming enrollment_number is the student identifier you want to store
          student_id: student.enrollment_number,
          status: "Shortlisted",
        });

        // Build UI row for the Results table
        uiRows.push({
          id: `drive-${driveId}-${student.enrollment_number}`,
          studentName: (student.name ?? student.enrollment_number).toString(),
          rollNo: student.enrollment_number.toString(),
          job: `${jobTitle} - ${companyName}`,
          oaStatus: resultType === "OA" ? "Cleared" : "-",
          interviewStatus:
            resultType === "Final Offer" ? "Cleared" : "Pending",
          finalStatus:
            resultType === "Final Offer" ? "Selected" : "Pending",
        });
      });

      if (!resultRowsForDb.length) {
        throw new Error(
          "No matching students found in students_data for the uploaded emails.",
        );
      }

      // 4) Insert into results table
      const { error: resultsError } = await supabase
        .from("results")
        .insert(resultRowsForDb);

      if (resultsError) {
        console.error(resultsError);
        throw resultsError;
      }

      // Prepend newly uploaded results so they appear at the top of the table.
      setResults((prev) => [...uiRows, ...prev]);

      const notFoundCount = notFoundEmails.size;

      toast({
        title: "Upload successful",
        description:
          notFoundCount > 0
            ? `Created drive and ${resultRowsForDb.length} result records. ${notFoundCount} email(s) were not found in students_data.`
            : `Created drive and ${resultRowsForDb.length} result records for OA shortlist.`,
      });

      setIsUploadOpen(false);
      setCompanyName("");
      setJobTitle("");
      setDescription("");
      setBatch("2026");
      setResultType("OA");
      setEmploymentType("Intern");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload failed",
        description:
          err?.message ??
          "There was a problem processing the CSV. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Show OA tab only for OA-level results (exclude final offers)
  const oaResults = results.filter(
    (r) => r.oaStatus !== "-" && r.finalStatus !== "Selected",
  );
  const finalOffers = results.filter((r) => r.finalStatus === "Selected");

  const handleEmail = (group: string) => {
    toast({ title: `Emails sent to ${group}` });
  };

  const getStatusBadge = (status: string) => {
    if (status === "Cleared" || status === "Selected") return "badge-approved";
    if (status === "Not Cleared" || status === "Rejected") return "badge-rejected";
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
          {data.map(r => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium text-foreground">{r.studentName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.rollNo}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{r.job}</td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.oaStatus)}>{r.oaStatus}</span></td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.interviewStatus)}>{r.interviewStatus}</span></td>
              <td className="px-4 py-3"><span className={getStatusBadge(r.finalStatus)}>{r.finalStatus}</span></td>
            </tr>
          ))}
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
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload results CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV of students and results. Make sure the CSV headers match your
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">students_data</code>
                table columns.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleUploadSubmit}
              className="space-y-4 pt-2"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company name</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input
                    id="batch"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="2026"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Result type</Label>
                  <Select
                    value={resultType}
                    onValueChange={(value: "OA" | "Final Offer") =>
                      setResultType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OA">OA</SelectItem>
                      <SelectItem value="Final Offer">Final Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employment type</Label>
                  <Select
                    value={employmentType}
                    onValueChange={(value: "Intern" | "FTE") =>
                      setEmploymentType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="FTE">FTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Any notes about this drive or selection process (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="csv">CSV file</Label>
                <Input
                  id="csv"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] ?? null;
                    setFile(selected);
                  }}
                  required
                />
              </div>

              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !file}
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleEmail("all eligible students")}>
          <Mail className="w-4 h-4" /> Email Eligible
        </Button>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleEmail("OA qualified")}>
          <Mail className="w-4 h-4" /> Email OA Qualified
        </Button>
        <Button size="sm" className="gap-2" onClick={() => handleEmail("final selected students")}>
          <Mail className="w-4 h-4" /> Email Selected
        </Button>
      </div>

      <Tabs defaultValue="oa">
        <TabsList>
          <TabsTrigger value="oa">OA Results</TabsTrigger>
          <TabsTrigger value="offers">Final Offers</TabsTrigger>
        </TabsList>
        <TabsContent value="oa" className="mt-4">
          <ResultTable data={oaResults} />
        </TabsContent>
        <TabsContent value="offers" className="mt-4">
          <ResultTable data={finalOffers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
