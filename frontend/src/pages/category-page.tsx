import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@/types";
import { Loader2 } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";

export default function CategoryPage() {
  const { id: categoryId } = useParams<{ id: string }>();

  const { data: category, isLoading, error } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!categoryId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Category Not Found</h2>
        <p className="text-secondary mb-6">The category you're looking for doesn't exist or may have been removed.</p>
        <a href="/shop" className="text-primary hover:underline">Return to Shop</a>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row items-center mb-6">
          {category.imageUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden mr-6 mb-4 md:mb-0">
              <img 
                src={category.imageUrl} 
                alt={category.name} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-2 text-center md:text-left">
              {category.name}
            </h1>
            <p className="text-secondary mb-2 max-w-3xl text-center md:text-left">
              {category.description}
            </p>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              {category.productCount} products in this category
            </p>
          </div>
        </div>
      </div>

      <ProductGrid 
        category={categoryId} 
        showFilters={true} 
        title={`${category.name} Products`}
      />
    </div>
  );
}
