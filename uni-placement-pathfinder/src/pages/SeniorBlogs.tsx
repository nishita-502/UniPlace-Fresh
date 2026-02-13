import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Search, Clock, ChevronRight, BookOpen } from "lucide-react";

export default function SeniorBlogs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching blogs:", error);
        setBlogs([]);
      } else {
        setBlogs(data || []);
      }
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return blogs.filter((b) => {
      const text = (b.title || "") + " " + (b.author_name || "");
      return text.toLowerCase().includes(q);
    });
  }, [blogs, searchQuery]);

  // Feature the first blog
  const featuredBlog = filteredBlogs[0];
  const remainingBlogs = filteredBlogs.slice(1);

  // NAVIGATION HANDLER ADDED
  const handleReadStory = (id: string) => {
    navigate(`/senior-blogs/${id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-primary rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Senior Blogs</h1>
            <p className="text-muted-foreground">
              Interview experiences and tips from seniors who cracked top companies
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search blogs or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64 bg-muted/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Blog */}
        {!loading && featuredBlog && (
          <Card
            className="border-0 shadow-lg overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10 group cursor-pointer hover:shadow-xl transition-all"
            onClick={() => handleReadStory(featuredBlog.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {featuredBlog.author_avatar_fallback || "SB"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {featuredBlog.title}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-muted-foreground">{featuredBlog.author_name}</span>
                  </div>
                  <p
                    className="text-muted-foreground mt-4 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: (featuredBlog.content_html || "").slice(0, 300),
                    }}
                  />
                  <div className="flex items-center gap-4 mt-4">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(featuredBlog.created_at).toLocaleDateString()}
                    </span>
                    <Button className="shadow-md">
                      Read Story <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!loading &&
            remainingBlogs.map((blog) => (
            <Card
              key={blog.id}
              className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
              onClick={() => handleReadStory(blog.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {blog.author_avatar_fallback || "SB"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {blog.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {blog.author_name}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                  {(blog.content_html || "").replace(/<[^>]+>/g, "").slice(0, 160)}
                </p>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary p-0 h-auto group-hover:translate-x-1 transition-transform">
                    Read Story <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && filteredBlogs.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground text-lg">No blogs found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
