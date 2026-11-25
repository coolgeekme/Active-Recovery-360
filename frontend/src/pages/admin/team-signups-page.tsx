import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft,
  Loader2,
  Users,
  Mail,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamSignup {
  id: string;
  name: string;
  email: string;
  organization?: string | null;
  role: string;
  message?: string | null;
  createdAt?: string;
  status: "new" | "contacted" | "enrolled" | "declined" | string;
  notes?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  enrolled: "Enrolled",
  declined: "Declined",
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  contacted: "bg-blue-100 text-blue-900",
  enrolled: "bg-green-100 text-green-900",
  declined: "bg-gray-200 text-gray-700",
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminTeamSignupsPage() {
  const { toast } = useToast();
  const [pendingDelete, setPendingDelete] = useState<TeamSignup | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data: signups = [], isLoading, error } = useQuery<TeamSignup[]>({
    queryKey: ["/api/admin/team-signups"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/team-signups/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-signups"] });
      toast({ title: "Signup updated" });
    },
    onError: (e: any) => {
      toast({
        title: "Could not update",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSignup = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/team-signups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team-signups"] });
      setPendingDelete(null);
      toast({ title: "Signup deleted" });
    },
    onError: (e: any) => {
      toast({
        title: "Could not delete",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const visible = signups.filter((s) => filter === "all" || s.status === filter);
  const newCount = signups.filter((s) => s.status === "new").length;

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">
          Teams &amp; Trainers
        </h1>
        <p className="text-secondary">
          Signups from the Teams &amp; Trainers page. Everyone here joins the same
          affiliate program — they just get their own commission rate.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {signups.length} signup{signups.length === 1 ? "" : "s"}
            {newCount > 0 && (
              <Badge className="bg-amber-100 text-amber-900 ml-2">
                {newCount} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All signups</SelectItem>
                <SelectItem value="new">New only</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://activerecovery360.goaffpro.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open affiliate portal
              </a>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-red-600 py-8 text-center">
              Error loading signups. Please try again.
            </p>
          ) : visible.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No signups yet</h3>
              <p className="text-muted-foreground">
                {filter === "all"
                  ? "Submissions from the Teams & Trainers page will appear here."
                  : "Nothing with that status."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border p-4 flex flex-col md:flex-row md:items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.name}</span>
                      {s.organization && (
                        <span className="text-muted-foreground">
                          — {s.organization}
                        </span>
                      )}
                      <Badge className={STATUS_STYLE[s.status] || ""}>
                        {STATUS_LABEL[s.status] || s.status}
                      </Badge>
                      <Badge variant="outline">
                        {s.role === "both"
                          ? "Team & trainer"
                          : s.role === "trainer"
                          ? "Trainer"
                          : "Team"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {s.email} · {formatDate(s.createdAt)}
                    </div>
                    {s.message && (
                      <p className="text-sm mt-2 whitespace-pre-wrap">
                        {s.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                    <Select
                      value={s.status}
                      onValueChange={(status) =>
                        updateStatus.mutate({ id: s.id, status })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Copy email"
                        onClick={() => copy(s.email, "Email")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" asChild title="Send email">
                        <a href={`mailto:${s.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete signup"
                        onClick={() => setPendingDelete(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this signup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} ({pendingDelete?.email}) will be permanently
              removed from the list. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSignup.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSignup.isPending}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteSignup.mutate(pendingDelete.id);
              }}
            >
              {deleteSignup.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
