import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Calendar, Share2, Bookmark } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("blogs").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching blog:", error);
        setBlog(null);
      } else {
        setBlog(data);
      }
      setLoading(false);
    };
    fetchBlog();
  }, [id]);

  // If blog is not found (invalid ID)
  if (!loading && !blog) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold">Blog not found</h2>
          <p className="text-muted-foreground mt-2">The story you are looking for does not exist.</p>
          <Button onClick={() => navigate("/senior-blogs")} className="mt-4">
            Back to Blogs
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto pb-20">

        {/* Navigation Bar */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md py-4 border-b mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/senior-blogs")}
            className="gap-2 pl-0 hover:bg-transparent hover:text-primary cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Blogs
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Blog Header */}
        {blog && (
          <div className="space-y-6 mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">{blog.title}</h1>
            <div className="flex items-center justify-between border-y py-6 mt-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                    {blog.author_avatar_fallback || "SB"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-lg">{blog.author_name}</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4" /> {new Date(blog.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 justify-end">
                  <Clock className="w-4 h-4" /> Approved blog
                </div>
              </div>
            </div>
            {blog.cover_image_url ? (
              <img src={blog.cover_image_url} alt="" className="w-full max-h-[420px] object-cover rounded-xl" />
            ) : null}
          </div>
        )}

        {/* Blog Content */}
        {blog && (
          <article className="prose prose-lg dark:prose-invert max-w-none text-foreground/90">
            <div dangerouslySetInnerHTML={{ __html: blog.content_html }} />
          </article>
        )}
      </div>
    </MainLayout>
  );
}
