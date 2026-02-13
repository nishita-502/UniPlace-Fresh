import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Define the shape of our Company object
type Company = {
  id: number;
  name: string;
  industry: string;
  location: string;
  website: string;
  description: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  status: string;
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", industry: "", location: "", website: "", description: "",
    pocName: "", pocEmail: "", pocPhone: "",
  });

  // --- 1. Fetch Companies from Supabase ---
  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      // Map DB snake_case to UI camelCase
      const mapped: Company[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        industry: c.industry || "",
        location: c.location || "",
        website: c.website || "",
        description: c.description || "",
        pocName: c.poc_name || "",
        pocEmail: c.poc_email || "",
        pocPhone: c.poc_phone || "",
        status: "Active", // Default status
      }));

      setCompanies(mapped);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({ title: "Failed to load companies", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // --- 2. Save (Add/Edit) Logic ---
  const handleSave = async () => {
    if (!form.name) return toast({ title: "Company Name is required", variant: "destructive" });

    const payload = {
      name: form.name,
      industry: form.industry,
      location: form.location,
      website: form.website,
      // description: form.description, // Uncomment if you added this column to DB
      poc_name: form.pocName,
      poc_email: form.pocEmail,
      poc_phone: form.pocPhone,
    };

    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Company updated successfully" });
      } else {
        // INSERT
        const { error } = await supabase
          .from("companies")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Company added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchCompanies(); // Refresh list
    } catch (error: any) {
      toast({ title: "Error saving company", description: error.message, variant: "destructive" });
    }
  };

  // --- 3. Delete Logic ---
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;

      setCompanies(prev => prev.filter(c => c.id !== id));
      toast({ title: "Company deleted" });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  // --- Helper Functions ---
  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", industry: "", location: "", website: "", description: "", pocName: "", pocEmail: "", pocPhone: "" });
  };

  const handleEdit = (c: Company) => {
    setForm({
      name: c.name,
      industry: c.industry,
      location: c.location,
      website: c.website,
      description: c.description,
      pocName: c.pocName,
      pocEmail: c.pocEmail,
      pocPhone: c.pocPhone
    });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Companies</h1>
          <p className="page-subtitle">Manage recruiting companies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="mt-1" />
              </div>
              <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(prev => ({ ...prev, industry: e.target.value }))} className="mt-1" /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} className="mt-1" /></div>
              <div><Label>POC Name</Label><Input value={form.pocName} onChange={e => setForm(prev => ({ ...prev, pocName: e.target.value }))} className="mt-1" /></div>
              <div><Label>POC Email</Label><Input value={form.pocEmail} onChange={e => setForm(prev => ({ ...prev, pocEmail: e.target.value }))} className="mt-1" /></div>
              <div><Label>POC Phone</Label><Input value={form.pocPhone} onChange={e => setForm(prev => ({ ...prev, pocPhone: e.target.value }))} className="mt-1" /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? "Update" : "Add"} Company</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="data-table">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Company", "Industry", "Location", "Status", "POC Name", "POC Email", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.industry}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.location}</td>
                    <td className="px-4 py-3"><span className="badge-active">Active</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.pocName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.pocEmail}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No companies found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}