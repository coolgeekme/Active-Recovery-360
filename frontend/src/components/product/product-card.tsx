import { Link } from "wouter";
import { Product } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
      <div className="relative">
        <Link href={`/product/${product.id}`}>
          <img 
            src={product.imageUrl || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"} 
            alt={product.name} 
            className="w-full h-48 object-cover cursor-pointer"
          />
        </Link>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-montserrat font-bold text-primary text-lg mb-1 hover:text-primary/80 transition cursor-pointer">
            {product.name}
          </h3>
        </Link>
        <p className="text-secondary text-sm mb-3 line-clamp-3">{product.description}</p>
        <div className="flex justify-between items-center mt-auto pt-2">
          {product.hidePrice && !user?.isDoctor ? (
            <span className="text-secondary text-sm font-montserrat font-semibold">
              Provider pricing only
            </span>
          ) : (
            <span className="text-primary font-bold">{formatPrice(product.price)}</span>
          )}
          <Button 
            asChild
            className="bg-primary text-white px-3 py-1 text-sm font-montserrat hover:bg-opacity-90 transition"
          >
            <Link href={`/product/${product.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
