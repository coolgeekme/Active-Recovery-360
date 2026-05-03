import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types";
import ProductCard from "./product-card";
import { Loader2 } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

interface ProductGridProps {
  category?: string;
  featured?: boolean;
  doctorId?: string;
  limit?: number;
  title?: string;
  showFilters?: boolean;
}

export default function ProductGrid({ 
  category, 
  featured, 
  doctorId,
  limit,
  title,
  showFilters = false
}: ProductGridProps) {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<string | undefined>("all");

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (category) params.append("categoryId", category);
    if (featured) params.append("featured", "true");
    if (doctorId) params.append("doctorId", doctorId);
    if (visibility && visibility !== "all") params.append("visibility", visibility);
    
    return params.toString();
  };

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: [`/api/products?${buildQueryParams()}`],
    select: (data) => limit ? data.slice(0, limit) : data,
  });

  // Filter visibility options based on user role
  const getVisibilityOptions = () => {
    const options = [{ value: "all", label: "All Products" }];
    
    options.push({ value: "public", label: "Public Products" });
    
    if (user?.isMember) {
      options.push({ value: "member", label: "Member Products" });
    }
    
    if (user?.isDoctor) {
      options.push({ value: "doctor", label: "Doctor Products" });
    }
    
    return options;
  };

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
        <p className="text-destructive">Error loading products. Please try again later.</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No products found.</p>
      </div>
    );
  }

  return (
    <div>
      {title && (
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-montserrat font-bold text-primary">{title}</h2>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
