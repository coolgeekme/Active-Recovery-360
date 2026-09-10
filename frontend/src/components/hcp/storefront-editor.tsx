import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Upload, Image as ImageIcon, ExternalLink, CheckCircle2, Circle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types";

export interface StorefrontEditableUser {
  id?: string;
  fullName?: string;
  storefrontEnabled?: boolean;
  storefrontSlug?: string | null;
  storefrontBio?: string | null;
  storefrontHeadshotUrl?: string | null;
  storefrontBannerUrl?: string | null;
  storefrontLogoUrl?: string | null;
  storefrontWelcomeMessage?: string | null;
  storefrontFeaturedProductIds?: string[];
  commissionPercent?: number;
}

interface StorefrontEditorProps {
  /** GET endpoint that returns {editable: User, products: Product[], profile: ...} */
  fetchEndpoint: string;
  /** PUT endpoint that accepts a partial user payload */
  saveEndpoint: string;
  /** Show commission % field (admin-only) */
  showCommission?: boolean;
  /** Endpoint that uploads images and returns {url} */
  uploadEndpoint?: string;
  /** Show a "finish setting up" checklist when the storefront isn't live yet */
  showOnboarding?: boolean;
}

export default function StorefrontEditor({
  fetchEndpoint,
  saveEndpoint,
  showCommission = false,
  uploadEndpoint = "/api/hcp/uploads/image",
  showOnboarding = false,
}: StorefrontEditorProps) {
  const { toast } = useToast();
  const headshotInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<{ editable: StorefrontEditableUser }>({
    queryKey: [fetchEndpoint],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/categories"],
  });

  const [productQuery, setProductQuery] = useState("");
  const [productCategory, setProductCategory] = useState<string>("all");

  const [draft, setDraft] = useState<StorefrontEditableUser | null>(null);
  const [uploading, setUploading] = useState<"headshot" | "banner" | "logo" | null>(null);

  useEffect(() => {
    if (data?.editable) {
      setDraft({
        id: data.editable.id,
        storefrontEnabled: !!data.editable.storefrontEnabled,
        storefrontSlug: data.editable.storefrontSlug || "",
        storefrontBio: data.editable.storefrontBio || "",
        storefrontHeadshotUrl: data.editable.storefrontHeadshotUrl || "",
        storefrontBannerUrl: data.editable.storefrontBannerUrl || "",
        storefrontLogoUrl: data.editable.storefrontLogoUrl || "",
        storefrontWelcomeMessage: data.editable.storefrontWelcomeMessage || "",
        storefrontFeaturedProductIds: data.editable.storefrontFeaturedProductIds || [],
        commissionPercent: data.editable.commissionPercent ?? 0,
      });
    }
  }, [data?.editable]);

  const saveMutation = useMutation({
    mutationFn: async (payload: StorefrontEditableUser) => {
      const res = await apiRequest("PUT", saveEndpoint, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Storefront saved",
        description: "Your changes are live.",
      });
      queryClient.invalidateQueries({ queryKey: [fetchEndpoint] });
    },
    onError: (e: Error) => {
      let msg = e.message || "Save failed";
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

  const upload = async (kind: "headshot" | "banner" | "logo", file: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const out = await res.json();
      const fieldByKind: Record<typeof kind, keyof StorefrontEditableUser> = {
        headshot: "storefrontHeadshotUrl",
        banner: "storefrontBannerUrl",
        logo: "storefrontLogoUrl",
      };
      setDraft((prev) =>
        prev ? { ...prev, [fieldByKind[kind]]: out.url } : prev
      );
      const labelByKind: Record<typeof kind, string> = {
        headshot: "Headshot",
        banner: "Banner",
        logo: "Clinic logo",
      };
      toast({ title: `${labelByKind[kind]} uploaded` });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const update = (patch: Partial<StorefrontEditableUser>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const toggleProduct = (id: string, checked: boolean) => {
    update({
      storefrontFeaturedProductIds: checked
        ? [...(draft.storefrontFeaturedProductIds || []), id]
        : (draft.storefrontFeaturedProductIds || []).filter((p) => p !== id),
    });
  };

  const slugSafe = (draft.storefrontSlug || "").trim().toLowerCase();

  const filteredProducts = allProducts.filter((p) => {
    const q = productQuery.trim().toLowerCase();
    if (q && !(p.name || "").toLowerCase().includes(q)) return false;
    if (productCategory !== "all" && !(p.categoryIds || []).includes(productCategory)) return false;
    return true;
  });

  const onboardingSteps = [
    { label: "Add a bio", done: !!(draft.storefrontBio && draft.storefrontBio.trim()) },
    { label: "Add a headshot", done: !!draft.storefrontHeadshotUrl },
    { label: "Add your clinic logo", done: !!draft.storefrontLogoUrl },
    { label: "Pick products to feature", done: (draft.storefrontFeaturedProductIds || []).length > 0 },
    { label: "Publish your storefront", done: !!draft.storefrontEnabled },
  ];
  const onboardingComplete = onboardingSteps.every((s) => s.done);

  return (
    <div className="space-y-6">
      {showOnboarding && !onboardingComplete && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Finish setting up your storefront</h3>
          <ul className="space-y-1.5">
            {onboardingSteps.map((step) => (
              <li key={step.label} className="flex items-center gap-2 text-sm">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-blue-300" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : "text-foreground"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Publish toggle + slug */}
      <div className="bg-muted/30 rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Publish Storefront</Label>
            <p className="text-xs text-muted-foreground">
              When enabled, your storefront is reachable at the URL below and orders are attributed to you.
            </p>
          </div>
          <Switch
            checked={!!draft.storefrontEnabled}
            onCheckedChange={(v) => update({ storefrontEnabled: v })}
            data-testid="storefront-enabled-toggle"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Storefront URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">/hcp/</span>
            <Input
              value={draft.storefrontSlug || ""}
              onChange={(e) =>
                update({
                  storefrontSlug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/-+/g, "-"),
                })
              }
              placeholder="recovery-clinic-denver"
              data-testid="storefront-slug-input"
            />
            {slugSafe && draft.storefrontEnabled && (
              <a
                href={`/hcp/${slugSafe}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm whitespace-nowrap"
              >
                <ExternalLink className="h-3 w-3" /> View
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lowercase letters, numbers, and dashes only.
          </p>
        </div>
      </div>

      {/* Welcome / bio */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="welcome">Welcome Message</Label>
          <Input
            id="welcome"
            value={draft.storefrontWelcomeMessage || ""}
            onChange={(e) => update({ storefrontWelcomeMessage: e.target.value })}
            placeholder="Welcome — these are the recovery tools I use most often with my patients."
            maxLength={140}
            data-testid="storefront-welcome-input"
          />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={draft.storefrontBio || ""}
            onChange={(e) => update({ storefrontBio: e.target.value })}
            placeholder="A few sentences about your practice and recovery philosophy."
            rows={4}
            maxLength={1500}
            data-testid="storefront-bio-input"
          />
        </div>
      </div>

      {/* Headshot + banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <Label>Headshot</Label>
          <div className="flex items-center gap-3 mt-2">
            {draft.storefrontHeadshotUrl ? (
              <img
                src={draft.storefrontHeadshotUrl}
                alt="Headshot"
                className="h-20 w-20 rounded-full object-cover border"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <input
              ref={headshotInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("headshot", f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => headshotInput.current?.click()}
              disabled={uploading === "headshot"}
              data-testid="upload-headshot-btn"
            >
              {uploading === "headshot" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload</span>
            </Button>
          </div>
        </div>
        <div>
          <Label>Banner</Label>
          <div className="flex items-center gap-3 mt-2">
            {draft.storefrontBannerUrl ? (
              <img
                src={draft.storefrontBannerUrl}
                alt="Banner"
                className="h-20 w-32 rounded object-cover border"
              />
            ) : (
              <div className="h-20 w-32 rounded bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <input
              ref={bannerInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("banner", f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => bannerInput.current?.click()}
              disabled={uploading === "banner"}
              data-testid="upload-banner-btn"
            >
              {uploading === "banner" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload</span>
            </Button>
          </div>
        </div>
        <div>
          <Label>Clinic Logo</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Your practice or clinic logo — shown on your storefront alongside your name.
          </p>
          <div className="flex items-center gap-3">
            {draft.storefrontLogoUrl ? (
              <img
                src={draft.storefrontLogoUrl}
                alt="Clinic logo"
                className="h-20 w-20 rounded object-contain border bg-white p-1"
              />
            ) : (
              <div className="h-20 w-20 rounded border bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <input
              ref={logoInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("logo", f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInput.current?.click()}
              disabled={uploading === "logo"}
              data-testid="upload-logo-btn"
            >
              {uploading === "logo" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Featured products */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <Label className="text-base font-semibold">Curated Products</Label>
          <span className="text-xs text-muted-foreground" data-testid="selected-count">
            {(draft.storefrontFeaturedProductIds || []).length} selected
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Search the catalog and check the products you want customers to see on your storefront.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Search products by name"
              className="pl-9"
              data-testid="product-search-input"
            />
          </div>
          <div className="sm:w-56">
            <Select value={productCategory} onValueChange={setProductCategory}>
              <SelectTrigger data-testid="product-category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto border rounded-md p-3">
          {filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2 col-span-full">
              No products match your search.
            </p>
          ) : (
            filteredProducts.map((p) => {
              const checked = (draft.storefrontFeaturedProductIds || []).includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/30 ${
                    checked ? "bg-primary/5 border border-primary/20" : ""
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => toggleProduct(p.id, !!c)}
                    data-testid={`product-toggle-${p.id}`}
                  />
                  <img
                    src={p.imageUrl || "https://via.placeholder.com/40"}
                    alt={p.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                  <span className="text-sm flex-1 truncate">{p.name}</span>
                  {checked && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </label>
              );
            })
          )}
        </div>

        {(draft.storefrontFeaturedProductIds || []).length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => update({ storefrontFeaturedProductIds: [] })}
            data-testid="clear-products-btn"
          >
            Clear all selected products
          </Button>
        )}
      </div>

      {/* Commission (admin only) */}
      {showCommission && (
        <div className="bg-muted/30 rounded-md p-4">
          <Label htmlFor="commission" className="text-base font-semibold">
            Commission %
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Percent of each order's total credited to this HCP. Snapshotted at order time.
          </p>
          <Input
            id="commission"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.commissionPercent ?? 0}
            onChange={(e) => update({ commissionPercent: Number(e.target.value) })}
            className="max-w-[200px]"
            data-testid="commission-percent-input"
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(draft)}
          disabled={saveMutation.isPending}
          size="lg"
          data-testid="save-storefront-btn"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Storefront"
          )}
        </Button>
      </div>
    </div>
  );
}
