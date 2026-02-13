import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Check, X, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function BlogsApproval() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .in("status", ["pending"])
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Error fetching blogs", description: error.message });
      setBlogs([]);
    } else {
      setBlogs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.from("blogs").update({ status: "approved", rejection_reason: null }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Approve failed", description: error.message });
    } else {
      toast({ title: "Blog approved" });
      fetchPending();
    }
  };

  const openReject = (blog: any) => {
    setSelectedBlog(blog);
    setRejectReason("");
    setRejectDialog(true);
  };

  const reject = async () => {
    if (!selectedBlog) return;
    const { error } = await supabase
      .from("blogs")
      .update({ status: "rejected", rejection_reason: rejectReason || null })
      .eq("id", selectedBlog.id);
    if (error) {
      toast({ variant: "destructive", title: "Reject failed", description: error.message });
    } else {
      toast({ title: "Blog rejected" });
      setRejectDialog(false);
      setSelectedBlog(null);
      fetchPending();
    }
  };

  const handleEdit = (blog: any) => {
    setEditTitle(blog.title);
    setEditContent(blog.content_html || "");
    setSelectedBlog(blog);
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBlog) return;
    supabase
      .from("blogs")
      .update({ title: editTitle, content_html: editContent })
      .eq("id", selectedBlog.id)
      .then(({ error }) => {
        if (error) {
          toast({ variant: "destructive", title: "Update failed", description: error.message });
        } else {
          toast({ title: "Blog updated" });
          setEditDialog(false);
          fetchPending();
        }
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Blogs Approval</h1>
      <p className="page-subtitle">Review and approve student blog submissions</p>

      <div className="data-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Title", "Author", "Submitted", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : blogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-muted-foreground">No pending blogs.</td>
              </tr>
            ) : (
              blogs.map(b => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{b.title}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{b.author_name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedBlog(b); }} className="p-1.5 rounded hover:bg-muted"><Eye className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => handleEdit(b)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => approve(b.id)} className="p-1.5 rounded hover:bg-primary/10"><Check className="w-4 h-4 text-primary" /></button>
                    <button onClick={() => openReject(b)} className="p-1.5 rounded hover:bg-destructive/10"><X className="w-4 h-4 text-destructive" /></button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedBlog && !editDialog} onOpenChange={() => setSelectedBlog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedBlog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground">By {selectedBlog?.author_name}</p>
            {selectedBlog?.cover_image_url ? (
              <img src={selectedBlog.cover_image_url} alt="" className="w-full max-h-64 object-cover rounded-md" />
            ) : null}
            <div className="prose prose-sm dark:prose-invert mt-4" dangerouslySetInnerHTML={{ __html: selectedBlog?.content_html || "" }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Blog</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Label>Reason (optional)</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="min-h-[120px]" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Blog</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Title</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1" /></div>
            <div><Label>Content</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="mt-1 min-h-[200px]" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
