import { useEffect, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Pencil, Save, X, Loader2, Upload } from "lucide-react";

interface Blog {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_fallback: string;
  title: string;
  content_html: string;
  cover_image_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string | null;
  created_at: string;
}

// Mock user for testing (replace with real auth later)
const MOCK_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "arisha.rizwan@university.edu",
  user_metadata: {
    full_name: "Arisha Rizwan"
  }
};

export default function MyBlogs() {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const fetchBlogs = async () => {
    const userId = MOCK_USER.id;
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ variant: "destructive", title: "Failed to load", description: error.message });
    } else {
      setBlogs((data || []) as Blog[]);
      // Simple in-app notification: show status changes not acknowledged
      try {
        const seenKey = `myblogs_seen_${userId}`;
        const seenIds: Record<string, string> = JSON.parse(localStorage.getItem(seenKey) || "{}");
        const newlyApproved = (data || []).filter(
          (b: any) => (b.status === "approved" || b.status === "rejected") && !seenIds[b.id]
        );
        if (newlyApproved.length > 0) {
          const msg =
            newlyApproved.length === 1
              ? `Your blog "${newlyApproved[0].title}" was ${newlyApproved[0].status}.`
              : `You have ${newlyApproved.length} blog updates.`;
          toast({ title: "Status update", description: msg });
          newlyApproved.forEach((b: any) => (seenIds[b.id] = b.status));
          localStorage.setItem(seenKey, JSON.stringify(seenIds));
        }
      } catch {}
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const startEdit = (blog: Blog) => {
    setEditingId(blog.id);
    setEditTitle(blog.title);
  };

  // Use effect to set editor content after element is rendered
  useEffect(() => {
    if (editingId && editorRef.current) {
      const blog = blogs.find(b => b.id === editingId);
      if (blog) {
        editorRef.current.innerHTML = blog.content_html || "";
      }
    }
  }, [editingId, blogs]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setCoverFile(null);
  };

  const saveEdit = async (blog: Blog) => {
    const html = editorRef.current?.innerHTML?.trim() || "";
    if (!editTitle || !html) {
      toast({ variant: "destructive", title: "Missing fields", description: "Title and content are required." });
      return;
    }
    let newCoverUrl = blog.cover_image_url;
    if (coverFile) {
      setCoverUploading(true);
      const userId = MOCK_USER.id;
      const path = `${userId}/${Date.now()}-${coverFile.name}`;
      const { error: uploadError } = await supabase.storage.from("blogs").upload(path, coverFile, {
        contentType: coverFile.type || "image/*",
        upsert: false,
      });
      setCoverUploading(false);
      if (uploadError) {
        toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
        return;
      }
      const { data: pub } = supabase.storage.from("blogs").getPublicUrl(path);
      newCoverUrl = pub.publicUrl;
    }
    const isRejected = blog.status === "rejected";
    const payload: Partial<Blog> = {
      title: editTitle,
      content_html: html,
      cover_image_url: newCoverUrl || null,
    };
    if (isRejected) {
      payload.status = "pending";
      payload.rejection_reason = null;
    }
    const { error } = await supabase.from("blogs").update(payload).eq("id", blog.id);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      toast({ title: "Saved", description: isRejected ? "Resubmitted for approval." : "Changes published." });
      cancelEdit();
      fetchBlogs();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">My Blogs</h1>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your posts...
          </div>
        ) : blogs.length === 0 ? (
          <p className="text-muted-foreground">You haven't written any blogs yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {blogs.map((b) => (
              <Card key={b.id} className="border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          b.status === "approved"
                            ? "bg-green-500/15 text-green-600 border-0"
                            : b.status === "pending"
                            ? "bg-yellow-500/15 text-yellow-700 border-0"
                            : "bg-red-500/15 text-red-600 border-0"
                        }
                      >
                        {b.status}
                      </Badge>
                      {b.status === "rejected" && b.rejection_reason ? (
                        <span className="text-xs text-muted-foreground">Reason: {b.rejection_reason}</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      {editingId === b.id ? (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => saveEdit(b)}>
                            <Save className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => startEdit(b)}>
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {editingId === b.id ? (
                    <div className="space-y-3">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                      <div
                        ref={editorRef}
                        className="min-h-[160px] border rounded-md p-3 text-sm focus:outline-none"
                        contentEditable
                        suppressContentEditableWarning
                      />
                      <div className="flex items-center gap-3">
                        <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                        <Button variant="secondary" size="sm" disabled={coverUploading}>
                          <Upload className="w-4 h-4 mr-1" /> {coverUploading ? "Uploading..." : "Change cover"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold">{b.title}</h3>
                      {b.cover_image_url ? (
                        <img src={b.cover_image_url} alt="" className="w-full max-h-64 object-cover rounded-md" />
                      ) : null}
                      <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: b.content_html }} />
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
