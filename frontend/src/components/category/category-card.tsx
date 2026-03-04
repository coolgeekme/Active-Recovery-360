import { useLocation } from "wouter";
import { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const [_, setLocation] = useLocation();

  return (
    <div 
      className="bg-white rounded-lg shadow overflow-hidden group block cursor-pointer"
      onClick={() => setLocation(`/category/${category.id}`)}
    >
      <div className="h-32 overflow-hidden">
        <img 
          src={category.imageUrl || "https://images.unsplash.com/photo-1576678927484-cc907957088c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=300&q=80"} 
          alt={category.name} 
          className="w-full h-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="p-4 text-center">
        <h3 className="font-montserrat font-bold text-primary group-hover:text-secondary transition">
          {category.name}
        </h3>
        <p className="text-secondary text-sm">{category.productCount} products</p>
      </div>
    </div>
  );
}
