import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default state matches DB schema
  const [settings, setSettings] = useState({
    collegeName: "",
    adminEmail: "",
    placementYear: "",
    notifyOnApplication: true,
    notifyOnResult: true,
    autoSyncSheets: true,
  });

  // 1. Fetch Settings on Load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // Fetch the single row (ID 1) created in Step 1
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            collegeName: data.college_name || "",
            adminEmail: data.admin_email || "",
            placementYear: data.placement_year || "",
            notifyOnApplication: data.notify_on_application,
            notifyOnResult: data.notify_on_result,
            autoSyncSheets: data.auto_sync_sheets,
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({ title: "Failed to load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  // 2. Save Handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          college_name: settings.collegeName,
          admin_email: settings.adminEmail,
          placement_year: settings.placementYear,
          notify_on_application: settings.notifyOnApplication,
          notify_on_result: settings.notifyOnResult,
          auto_sync_sheets: settings.autoSyncSheets,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1); // Always update row 1

      if (error) throw error;

      toast({ title: "Settings saved successfully" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Settings</h1>
      <p className="page-subtitle">Configure dashboard preferences</p>

      <div className="max-w-2xl space-y-6">

        {/* General Settings */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-semibold text-foreground">General</h3>
          <div>
            <Label>College Name</Label>
            <Input
              value={settings.collegeName}
              onChange={e => setSettings(p => ({ ...p, collegeName: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Admin Email</Label>
            <Input
              value={settings.adminEmail}
              onChange={e => setSettings(p => ({ ...p, adminEmail: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Placement Year</Label>
            <Input
              value={settings.placementYear}
              onChange={e => setSettings(p => ({ ...p, placementYear: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
          <div className="flex items-center justify-between">
            <Label>Notify on new applications</Label>
            <Switch
              checked={settings.notifyOnApplication}
              onCheckedChange={v => setSettings(p => ({ ...p, notifyOnApplication: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notify on result uploads</Label>
            <Switch
              checked={settings.notifyOnResult}
              onCheckedChange={v => setSettings(p => ({ ...p, notifyOnResult: v }))}
            />
          </div>
        </div>

        {/* Integration Settings */}
        <div className="stat-card space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Integrations</h3>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-sync to Google Sheets</Label>
              <p className="text-xs text-muted-foreground">Automatically sync data to linked Google Sheets</p>
            </div>
            <Switch
              checked={settings.autoSyncSheets}
              onCheckedChange={v => setSettings(p => ({ ...p, autoSyncSheets: v }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}