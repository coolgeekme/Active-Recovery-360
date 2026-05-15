import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import LocationEditor from "@/components/recovery/location-editor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  RecoveryService,
  RecoveryServiceLocation,
  RECOVERY_CATEGORIES,
} from "@/types/recovery-service";

interface Draft {
  name: string;
  category: string;
  description: string;
  logoUrl: string;
  photoUrl: string;
  website: string;
  email: string;
  phone: string;
  memberDiscount: { text: string };
  locations: RecoveryServiceLocation[];
  status: "draft" | "published";
}

const EMPTY_DRAFT: Draft = {
  name: "",
  category: "",
  description: "",
  logoUrl: "",
  photoUrl: "",
  website: "",
  email: "",
  phone: "",
  memberDiscount: { text: "" },
  locations: [],
  status: "draft",
};

export default function AdminRecoveryServiceFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const { data: existing, isLoading } = useQuery<RecoveryService>({
    queryKey: [`/api/admin/recovery-services/${id}`],
    enabled: isEdit,
    // No dedicated GET-by-id admin endpoint — hydrate from the list
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/recovery-services");
      const all: RecoveryService[] = await res.json();
      const found = all.find((s) => s.id === id);
      if (!found) throw new Error("Not found");
      return found;
    },
  });

  useEffect(() => {
    if (existing) {
      setDraft({
        name: existing.name,
        category: existing.category,
        description: existing.description,
        logoUrl: existing.logoUrl || "",
        photoUrl: existing.photoUrl || "",
        website: existing.website || "",
        email: existing.email || "",
        phone: existing.phone || "",
        memberDiscount: { text: existing.memberDiscount?.text || "" },
        locations: existing.locations || [],
        status: existing.status,
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Draft) => {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit
        ? `/api/admin/recovery-services/${id}`
        : "/api/admin/recovery-services";
      const res = await apiRequest(method, url, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Service updated" : "Service created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recovery-services"] });
      navigate("/admin/recovery-services");
    },
    onError: (e: Error) => {
      let msg = e.message;
      const m = msg.match(/^\d+:\s*(.+)$/);
      if (m) {
        try {
          msg = JSON.parse(m[1]).detail || m[1];
        } catch {
          msg = m[1];
        }
      }
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Link
        href="/admin/recovery-services"
        className="text-sm text-secondary inline-flex items-center hover:text-primary mb-3"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to directory
      </Link>
      <h1 className="text-3xl font-montserrat font-bold text-primary mb-6">
        {isEdit ? "Edit Recovery Service" : "Add Recovery Service"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                data-testid="rs-name"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}
              >
                <SelectTrigger data-testid="rs-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {RECOVERY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="What does this provider offer?"
              data-testid="rs-description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="logo">Logo URL (optional)</Label>
              <Input
                id="logo"
                value={draft.logoUrl}
                onChange={(e) => setDraft((d) => ({ ...d, logoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="photo">Hero Photo URL (optional)</Label>
              <Input
                id="photo"
                value={draft.photoUrl}
                onChange={(e) => setDraft((d) => ({ ...d, photoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={draft.website}
                onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Member Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="discount">Discount offered to AR360 members *</Label>
          <Input
            id="discount"
            value={draft.memberDiscount.text}
            onChange={(e) =>
              setDraft((d) => ({ ...d, memberDiscount: { text: e.target.value } }))
            }
            placeholder="10% off all services, or $20 off first visit"
            data-testid="rs-discount"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Non-members will see "Discount available — join to unlock" instead of the actual offer.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <LocationEditor
            value={draft.locations}
            onChange={(locs) => setDraft((d) => ({ ...d, locations: locs }))}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6 flex items-center justify-between gap-4">
          <div>
            <Label className="font-semibold">Publish to directory</Label>
            <p className="text-xs text-muted-foreground">
              Off = saves as draft (admin only). On = visible to members.
            </p>
          </div>
          <Switch
            checked={draft.status === "published"}
            onCheckedChange={(v) =>
              setDraft((d) => ({ ...d, status: v ? "published" : "draft" }))
            }
            data-testid="rs-publish-toggle"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 mt-6">
        <Button asChild variant="outline">
          <Link href="/admin/recovery-services">Cancel</Link>
        </Button>
        <Button
          onClick={() => saveMutation.mutate(draft)}
          disabled={saveMutation.isPending}
          size="lg"
          data-testid="rs-save-btn"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Service"}
        </Button>
      </div>
    </div>
  );
}
