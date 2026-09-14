import { useMemo, useState } from "react";
import { Product } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface RelatedProductsPickerProps {
  /** Selected related product ids, in display order. */
  value: string[];
  onChange: (ids: string[]) => void;
  /** The product being edited - it can never be related to itself. */
  currentProductId?: string;
  /** Product catalog (the admin page already fetches it). */
  products: Product[];
  /** Prefix for the checkbox DOM ids, so the add/edit dialogs don't collide. */
  idPrefix: string;
}

/**
 * Searchable multi-select for a product's curated "Related Products" list.
 *
 * The order products are ticked in is the order they render on the storefront,
 * so the selection is shown back as ordered chips the admin can remove.
 */
export default function RelatedProductsPicker({
  value,
  onChange,
  currentProductId,
  products,
  idPrefix,
}: RelatedProductsPickerProps) {
  const [search, setSearch] = useState("");

  const selectable = useMemo(
    () => products.filter((p) => p.id !== currentProductId),
    [products, currentProductId]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return selectable.slice(0, 200);
    return selectable
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 200);
  }, [selectable, search]);

  const byId = useMemo(
    () => new Map(selectable.map((p) => [p.id, p])),
    [selectable]
  );

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      if (!value.includes(id)) onChange([...value, id]);
    } else {
      onChange(value.filter((v) => v !== id));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground" data-testid={`${idPrefix}-related-count`}>
          {value.length} selected
        </span>
        {value.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid={`${idPrefix}-related-clear`}
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid={`${idPrefix}-related-chips`}>
          {value.map((id, index) => (
            <Badge key={id} variant="secondary" className="gap-1">
              <span className="text-muted-foreground">{index + 1}.</span>
              {byId.get(id)?.name ?? "Unknown product"}
              <button
                type="button"
                aria-label={`Remove ${byId.get(id)?.name ?? "product"}`}
                className="ml-1 rounded-full hover:bg-black/10"
                onClick={() => onChange(value.filter((v) => v !== id))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products by name"
          className="pl-9"
          value={search}
          data-testid={`${idPrefix}-related-search`}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-md border p-4 max-h-56 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No products match that search.</p>
        )}
        {filtered.map((product) => (
          <div key={product.id} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-rel-${product.id}`}
              checked={value.includes(product.id)}
              data-testid={`${idPrefix}-related-toggle-${product.id}`}
              onCheckedChange={(checked) => toggle(product.id, checked === true)}
            />
            <label
              htmlFor={`${idPrefix}-rel-${product.id}`}
              className="text-sm leading-none cursor-pointer"
            >
              {product.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
