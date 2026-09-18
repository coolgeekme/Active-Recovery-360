import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Loader2, Mail, MapPin,
  Phone, RefreshCw, Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RecoveryProviderApplication {
  id: string;
  firstName: string;
  lastName: string;
  credentials?: string | null;
  businessName: string;
  providerTypes: string[];
  providerTypeOther?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  businessPhone?: string | null;
  email: string;
  website?: string | null;
  services: string[];
  serviceOther?: string | null;
  serviceDescription?: string | null;
  idealClients: string[];
  idealClientOther?: string | null;
  serviceArea?: string | null;
  bio?: string | null;
  yearsInPractice?: string | null;
  certifications?: string | null;
  specialties?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  bookingLink?: string | null;
  networkTier?: string | null;
  status: string;
  isRead: boolean;
  createdAt?: string;
}

const STATUS_OPTIONS = ["new", "contacted", "approved", "declined", "archived"];

const statusStyle: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function AdminRecoveryProviderApplicationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: applications = [], isLoading, refetch } = useQuery<RecoveryProviderApplication[]>({
    queryKey: [`/api/admin/recovery-provider-applications?status=${filterStatus}`],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/recovery-provider-applications/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recovery-provider-applications"] });
      toast({ title: "Application updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/admin" className="text-sm text-secondary inline-flex items-center hover:text-primary mb-3">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="text-3xl font-montserrat font-bold text-primary">
          Recovery Provider Applications
        </h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      <p className="text-secondary mb-6">
        Applications from the Local Recovery Services provider signup page.
      </p>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>
              Applications
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({applications.length})
              </span>
            </CardTitle>
            <div className="w-52">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="application-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-10" data-testid="applications-empty">
              <p className="text-muted-foreground">No provider applications yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submissions from <span className="font-mono">/recovery-services/signup</span> will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => {
                const open = expanded === app.id;
                const name = [app.firstName, app.lastName].filter(Boolean).join(" ");
                return (
                  <div key={app.id} className="border rounded-md" data-testid={`application-${app.id}`}>
                    <button
                      type="button"
                      className="w-full text-left p-4 flex flex-wrap items-start justify-between gap-3 hover:bg-muted/30"
                      onClick={() => setExpanded(open ? null : app.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-primary">{app.businessName}</span>
                          <Badge variant="outline" className={statusStyle[app.status] || ""}>
                            {app.status}
                          </Badge>
                          {app.networkTier && (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
                              <Star className="h-3 w-3 mr-1" /> {app.networkTier}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-secondary mt-1">
                          {name}{app.credentials ? `, ${app.credentials}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{app.email}</span>
                          {app.businessPhone && (
                            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{app.businessPhone}</span>
                          )}
                          {(app.city || app.state) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{[app.city, app.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""}
                        </span>
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t px-4 py-4 space-y-4 bg-muted/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                          <Field label="Provider type" value={[...(app.providerTypes || []), app.providerTypeOther].filter(Boolean).join(", ")} />
                          <Field label="Services" value={[...(app.services || []), app.serviceOther].filter(Boolean).join(", ")} />
                          <Field label="Ideal clients" value={[...(app.idealClients || []), app.idealClientOther].filter(Boolean).join(", ")} />
                          <Field label="Service area" value={app.serviceArea} />
                          <Field label="Years in practice" value={app.yearsInPractice} />
                          <Field label="Certifications" value={app.certifications} />
                          <Field label="Specialties" value={app.specialties} />
                          <Field label="Website" value={app.website} />
                          <Field label="Address" value={[app.businessAddress, app.city, app.state, app.zipCode].filter(Boolean).join(", ")} />
                          <Field label="Facebook" value={app.facebook} />
                          <Field label="Instagram" value={app.instagram} />
                          <Field label="LinkedIn" value={app.linkedin} />
                          <Field label="Booking link" value={app.bookingLink} />
                        </div>
                        <Field label="Services description" value={app.serviceDescription} block />
                        <Field label="Bio" value={app.bio} block />

                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Select
                            value={app.status}
                            onValueChange={(status) => updateMutation.mutate({ id: app.id, status })}
                          >
                            <SelectTrigger className="w-44" data-testid={`status-${app.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          <Button asChild variant="outline" size="sm" className="ml-auto">
                            <a href={`mailto:${app.email}?subject=${encodeURIComponent("Your Active Recovery 360 provider application")}`}>
                              <Mail className="h-4 w-4 mr-2" /> Email provider
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  if (!value) return null;
  return (
    <div className={block ? "" : ""}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="whitespace-pre-wrap">{value}</span>
    </div>
  );
}
