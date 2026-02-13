import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type Company = {
  id: number;
  name: string;
  industry: string;
  location: string;
  total_offers: number;
  poc_name: string;
  poc_email: string;
  poc_phone: string;
};

export default function CompaniesPOC() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch companies from Supabase on load
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          throw error;
        }

        if (data) {
          setCompanies(data);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
        toast({
          title: "Error fetching data",
          description: "Could not load companies database.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [toast]);

  // Filter based on search input
  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.poc_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">Companies & POC Database</h1>
          <p className="page-subtitle">Company and point-of-contact directory</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search company or POC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Companies Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-background">
            <div className="p-4 bg-muted/30 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Companies</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Name", "Industry", "Location", "Offers"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.industry}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.location}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {c.total_offers}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">
                        No companies found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* POC Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-background">
            <div className="p-4 bg-muted/30 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Point of Contact</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Company", "POC Name", "Email", "Phone"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.poc_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.poc_email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {c.poc_phone || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">
                        No POCs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}