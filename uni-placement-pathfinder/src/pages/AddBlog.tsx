import { useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, Bold, Italic, Underline, Link as LinkIcon, Image as ImageIcon, Loader2 } from "lucide-react";

// Mock user for testing (replace with real auth later)
const MOCK_USER = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "arisha.rizwan@university.edu",
  user_metadata: {
    full_name: "Arisha Rizwan"
  }
};

export default function AddBlog() {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exec = (cmd: string, value: string | undefined = undefined) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  const handleUploadCover = async () => {
    if (!coverFile) {
      toast({ variant: "destructive", title: "No file selected", description: "Choose an image to upload." });
      return;
    }
    setUploading(true);
    const userId = MOCK_USER.id;
    try {
      const path = `${userId}/${Date.now()}-${coverFile.name}`;
      const { error: uploadError } = await supabase.storage.from("blogs").upload(path, coverFile, {
        contentType: coverFile.type || "image/*",
        upsert: false,
      });
      if (uploadError) {
        toast({ variant: "destructive", title: "Upload failed", description: uploadError.message });
        setUploading(false);
        return;
      }
      const { data: pub } = supabase.storage.from("blogs").getPublicUrl(path);
      setCoverUrl(pub.publicUrl);
      toast({ title: "Cover uploaded", description: "Image ready to use." });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const html = editorRef.current?.innerHTML?.trim() || "";
    if (!title || !html) {
      toast({ variant: "destructive", title: "Missing fields", description: "Title and content are required." });
      return;
    }
    setSubmitting(true);
    
    const user = MOCK_USER;
    const authorName = user.user_metadata?.full_name || user.email || "Student";
    const initials = authorName
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const { error } = await supabase.from("blogs").insert([
      {
        author_id: user.id,
        author_name: authorName,
        author_avatar_fallback: initials,
        title,
        content_html: html,
        cover_image_url: coverUrl || null,
        status: "pending",
      },
    ]);
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Submission failed", description: error.message });
    } else {
      toast({ title: "Submitted for approval", description: "Admin will review your blog." });
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setCoverFile(null);
      setCoverUrl("");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Add Blog</h1>

        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="My Amazon SDE Interview Experience" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => exec("bold")}>
              <Bold className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => exec("italic")}>
              <Italic className="w-4 h-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => exec("underline")}>
              <Underline className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const url = prompt("Enter URL");
                if (url) exec("createLink", url);
              }}
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </div>
          <div
            ref={editorRef}
            className="min-h-[200px] border rounded-md p-3 text-sm focus:outline-none"
            contentEditable
            placeholder="Write your experience..."
            suppressContentEditableWarning
          />
          <p className="text-xs text-muted-foreground">Rich text editor supports basic formatting, links, and lists.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Cover Image (optional)</label>
          <div className="flex items-center gap-3">
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            <Button type="button" variant="secondary" onClick={handleUploadCover} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="ml-2">Upload</span>
            </Button>
            {coverUrl && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                <ImageIcon className="w-3 h-3 mr-1" /> Uploaded
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span className="ml-2">Submit for Approval</span>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
