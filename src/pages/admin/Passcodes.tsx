import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "./AdminLayout";
import { Spinner } from "@/components/ui/spinner";

interface PasscodeRecord {
  code: string;
  testType: string;
  status: "active" | "used";
  createdAt: string;
  usedAt: string | null;
  usedBy: string | null;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  child_3_5: "Ages 3-5",
  child_6_9: "Ages 6-9",
  preteen_10_12: "Ages 10-12",
  teen_13_17: "Ages 13-17",
  single_test: "Adult Test",
  couples_test: "Couples Test",
  corporate_team: "Corporate Team",
};

export default function AdminPasscodes() {
  const { toast } = useToast();
  const [passcodes, setPasscodes] = useState<PasscodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("single_test");
  const [generating, setGenerating] = useState(false);

  const fetchPasscodes = async () => {
    try {
      const r = await fetch("/api/passcodes");
      if (r.ok) {
        const data = await r.json() as PasscodeRecord[];
        setPasscodes(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPasscodes(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await fetch("/api/passcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType: selectedType }),
      });
      if (!r.ok) throw new Error("Failed to generate");
      const record = await r.json() as PasscodeRecord;
      setPasscodes(prev => [record, ...prev]);
      toast({ title: "Passcode Generated", description: `${record.code} for ${TEST_TYPE_LABELS[record.testType] ?? record.testType}` });
    } catch {
      toast({ title: "Error", description: "Could not generate passcode", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  return (
    <AdminLayout title="Passcodes">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base text-primary">Generate New Passcode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="flex h-10 w-full sm:w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(TEST_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {generating ? "Generating..." : "Generate Passcode"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-primary">All Passcodes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : passcodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No passcodes generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Test Type</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium">Used</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passcodes.map((p, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 font-mono font-bold">{p.code}</td>
                      <td className="py-3">{TEST_TYPE_LABELS[p.testType] ?? p.testType}</td>
                      <td className="py-3">
                        <Badge className={p.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}>
                          {p.status === "active" ? "Active" : "Used"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="py-3 text-muted-foreground text-xs">{p.usedAt ? new Date(p.usedAt).toLocaleString() : "\u2014"}</td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(p.code)}
                        >
                          Copy
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
