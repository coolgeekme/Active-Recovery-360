import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProductVariant } from "@/types";

export interface VariantDraft {
  sku: string;
  name: string;
  price: number; // dollars
  stockQuantity: number;
  color?: string;
  size?: string;
  imageUrl?: string;
}

interface VariantEditorProps {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
}

export function variantsToBackend(drafts: VariantDraft[]): ProductVariant[] {
  return drafts.map((d) => {
    const attributes: ProductVariant["attributes"] = {};
    if (d.color) attributes.color = d.color;
    if (d.size) attributes.size = d.size;
    return {
      sku: d.sku,
      name: d.name || d.color || d.size || d.sku,
      price: Math.round(Number(d.price || 0) * 100),
      stockQuantity: Number(d.stockQuantity || 0),
      imageUrl: d.imageUrl || null,
      attributes,
    };
  });
}

export function variantsFromBackend(variants: ProductVariant[] | undefined | null): VariantDraft[] {
  if (!variants || variants.length === 0) return [];
  return variants.map((v) => ({
    sku: v.sku,
    name: v.name,
    price: (v.price || 0) / 100,
    stockQuantity: v.stockQuantity || 0,
    color: v.attributes?.color || "",
    size: v.attributes?.size || "",
    imageUrl: v.imageUrl || "",
  }));
}

const EMPTY: VariantDraft = {
  sku: "",
  name: "",
  price: 0,
  stockQuantity: 0,
  color: "",
  size: "",
  imageUrl: "",
};

export default function VariantEditor({ value, onChange }: VariantEditorProps) {
  const { toast } = useToast();
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const update = (idx: number, patch: Partial<VariantDraft>) => {
    onChange(value.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([...value, { ...EMPTY }]);
  };

  const uploadImage = async (idx: number, file: File) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // apiRequest doesn't support FormData natively; use fetch with auth header
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      update(idx, { imageUrl: data.url });
      toast({ title: "Image uploaded", description: data.url });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Variants</Label>
          <p className="text-xs text-muted-foreground">
            Add SKUs for size/color combinations. When ≥2 variants exist, the
            product price defaults to the lowest variant price.
          </p>
        </div>
        <Button type="button" size="sm" onClick={add} data-testid="add-variant-btn">
          <Plus className="h-4 w-4 mr-1" />
          Add Variant
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No variants. Add one to enable size/color selection on the product page.
        </p>
      )}

      {value.map((v, idx) => (
        <div
          key={idx}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border rounded-md p-3 bg-background"
          data-testid={`variant-row-${idx}`}
        >
          <div className="md:col-span-3">
            <Label className="text-xs">SKU</Label>
            <Input
              value={v.sku}
              onChange={(e) => update(idx, { sku: e.target.value })}
              placeholder="HAKT-2RL-RED"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Display Name</Label>
            <Input
              value={v.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              placeholder="Red"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Color</Label>
            <Input
              value={v.color || ""}
              onChange={(e) => update(idx, { color: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Size</Label>
            <Input
              value={v.size || ""}
              onChange={(e) => update(idx, { size: e.target.value })}
              placeholder="optional"
            />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Price ($)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={v.price}
              onChange={(e) => update(idx, { price: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Stock</Label>
            <Input
              type="number"
              min={0}
              value={v.stockQuantity}
              onChange={(e) => update(idx, { stockQuantity: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-1 flex items-end justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => remove(idx)}
              title="Remove variant"
              data-testid={`remove-variant-${idx}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="md:col-span-12 flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Image URL</Label>
              <Input
                value={v.imageUrl || ""}
                onChange={(e) => update(idx, { imageUrl: e.target.value })}
                placeholder="/api/files/ar360/products/...png  or  https://..."
              />
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              ref={(el) => {
                fileInputs.current[idx] = el;
              }}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(idx, f);
                if (e.target) e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputs.current[idx]?.click()}
              disabled={uploadingIdx === idx}
              data-testid={`upload-variant-image-${idx}`}
            >
              {uploadingIdx === idx ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload</span>
            </Button>
            {v.imageUrl ? (
              <img
                src={v.imageUrl}
                alt={v.name || v.sku}
                className="h-10 w-10 rounded object-cover border"
              />
            ) : (
              <div className="h-10 w-10 rounded border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
