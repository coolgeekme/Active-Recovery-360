import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import ProductCard from "./product-card";
import { Loader2 } from "lucide-react";

interface CuratedRelatedProductsProps {
  /** Related product ids, in the order the admin chose them. */
  ids: string[];
  /** Current product id - never shown as its own related product. */
  currentProductId?: string;
}

/**
 * Renders the admin-curated "Related Products" list for a product page.
 *
 * Products are fetched in one request and re-ordered client-side to match the
 * curated order, because that order is the whole point of the feature. Products
 * that have since been deleted or hidden simply drop out.
 */
export default function CuratedRelatedProducts({
  ids,
  currentProductId,
}: CuratedRelatedProductsProps) {
  const wanted = ids.filter((id) => id && id !== currentProductId);

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: [`/api/products?ids=${wanted.join(",")}`],
    enabled: wanted.length > 0,
  });

  if (wanted.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No related products yet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading related products.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No related products found.</p>
      </div>
    );
  }

  const rank = new Map(wanted.map((id, index) => [id, index]));
  const ordered = [...products].sort(
    (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {ordered.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
