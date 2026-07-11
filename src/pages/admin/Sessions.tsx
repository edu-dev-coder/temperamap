import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Filter, Eye, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface Session {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  testType: string;
  status: "pending" | "paid" | "in_progress" | "completed";
  createdAt: string;
  completedAt: string | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  paid: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-purple-100 text-purple-700 border-purple-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  in_progress: "In Progress",
  completed: "Completed",
};

const TYPE_LABELS: Record<string, string> = {
  child_3_5: "Ages 3-5",
  child_6_9: "Ages 6-9",
  preteen_10_12: "Ages 10-12",
  teen_13_17: "Ages 13-17",
  single_test: "Adult Test",
  couples_test: "Couples Test",
  corporate_team: "Corporate Team",
};

export default function AdminSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [detailSession, setDetailSession] = useState<Session | null>(null);

  const fetchSessions = async (status: string) => {
    setLoading(true);
    try {
      const url = status ? `/api/admin/sessions?status=${status}` : "/api/admin/sessions";
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setSessions(Array.isArray(data) ? data : data.sessions ?? []);
    } catch {
      toast({ title: "Error", description: "Could not load sessions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(statusFilter); }, [statusFilter]);

  return (
    <AdminLayout title="Test Sessions">
      {/* Filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className={
              statusFilter === f.value
                ? "bg-primary hover:bg-primary/90 text-white"
                : ""
            }
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No sessions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Test Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="hidden lg:table-cell">Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.userName || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {s.userEmail || "—"}
                    </TableCell>
                    <TableCell>{TYPE_LABELS[s.testType] ?? s.testType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[s.status] ?? ""}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailSession(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {s.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              window.location.href = `/results/${s.id}`;
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailSession} onOpenChange={(open) => { if (!open) setDetailSession(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Viewing session {detailSession?.id}
            </DialogDescription>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{detailSession.userName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{detailSession.userEmail || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test Type</span>
                <span>{TYPE_LABELS[detailSession.testType] ?? detailSession.testType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={STATUS_STYLES[detailSession.status] ?? ""}>
                  {STATUS_LABELS[detailSession.status] ?? detailSession.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(detailSession.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span>{detailSession.completedAt ? new Date(detailSession.completedAt).toLocaleString() : "—"}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
