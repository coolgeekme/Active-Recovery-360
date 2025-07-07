import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

import ProductGrid from "@/components/product/product-grid";
import CategoryCard from "@/components/category/category-card";

export default function ShopPage() {
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="lg:w-3/4">
          <div className="mb-8">
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-2">Shop Recovery Products</h1>
            <p className="text-secondary">Browse our collection of specialized recovery products for your healing journey.</p>
          </div>

          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="pt-6">
              <ProductGrid showFilters={true} title="All Products" />
            </TabsContent>

            <TabsContent value="featured" className="pt-6">
              <ProductGrid featured={true} title="Featured Products" />
            </TabsContent>

            <TabsContent value="categories" className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Membership Benefits</CardTitle>
              <CardDescription>Join to unlock member-only products</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm">Exclusive Products</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm">Doctor Storefronts</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm">Free Recovery Kit</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm">One-time $49 Fee</span>
                </li>
              </ul>
              <Separator className="my-4" />
              <Button asChild className="w-full btn-primary-enhanced">
                <a href="/membership-checkout">
                  Become a Member
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Visibility</CardTitle>
              <CardDescription>Understanding product access levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-[#28A745] rounded-full mr-2"></div>
                    <span className="font-medium">PUBLIC</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Available to all visitors</p>
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-[#E65100] rounded-full mr-2"></div>
                    <span className="font-medium">MEMBERS</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Exclusive to AR360 members</p>
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-[#DC3545] rounded-full mr-2"></div>
                    <span className="font-medium">DOCTOR</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Available only to healthcare professionals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
