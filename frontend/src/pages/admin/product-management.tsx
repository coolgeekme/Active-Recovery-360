import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, User } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import VariantEditor, {
  VariantDraft,
  variantsToBackend,
  variantsFromBackend,
} from "@/components/admin/variant-editor";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  PlusCircle, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  Eye, 
  EyeOff, 
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from "lucide-react";

// Create a schema for the product form
const imageUrlSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || v.startsWith("/") || /^https?:\/\//.test(v),
    "Enter a valid URL or leave blank (relative paths starting with / are allowed)"
  );

const productFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  price: z.coerce.number().min(0.01, "Price must be at least $0.01"),
  imageUrl: imageUrlSchema,
  visibility: z.enum(["public", "member", "doctor"], {
    required_error: "Visibility is required",
  }),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  stockQuantity: z.coerce.number().min(0, "Stock quantity cannot be negative"),
  featured: z.boolean().default(false),
  hidePrice: z.boolean().default(false),
  doctorIds: z.array(z.string()).optional(),
  brand: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(location === "/admin/products/new");
  const [filterVisibility, setFilterVisibility] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [filterFeatured, setFilterFeatured] = useState<boolean | undefined>(undefined);
  // Variant drafts kept outside react-hook-form because they're a complex
  // dynamic list. They are merged into the payload at submit time.
  const [addVariants, setAddVariants] = useState<VariantDraft[]>([]);
  const [editVariants, setEditVariants] = useState<VariantDraft[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // One-shot catalog import (wipes existing products, re-applies the
  // consolidated 39-product seed). Used after a fresh deploy to align the
  // production database with the preview snapshot.
  const importCatalogMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/seed/import-catalog");
      return await res.json();
    },
    onSuccess: (data: { stats?: { products_inserted?: number; products_deleted?: number } }) => {
      const inserted = data?.stats?.products_inserted ?? 0;
      const deleted = data?.stats?.products_deleted ?? 0;
      toast({
        title: "Catalog imported",
        description: `Wiped ${deleted} legacy products, inserted ${inserted} from the seed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsImportDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error?.message || "Could not import the catalog",
        variant: "destructive",
      });
    },
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch doctors for doctor-specific products
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/doctors"],
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      toast({
        title: "Product deleted",
        description: "The product has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete product: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Reorder product (up/down within its category)
  const moveProductMutation = useMutation({
    mutationFn: async ({ id, direction, categoryId }: { id: string; direction: "up" | "down"; categoryId?: string }) => {
      const qs = new URLSearchParams({ direction });
      if (categoryId) qs.set("categoryId", categoryId);
      const res = await apiRequest(
        "POST",
        `/api/admin/products/${id}/move?${qs.toString()}`
      );
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (data && data.moved === false) {
        toast({
          title: "Cannot move further",
          description: data.message || "Already at the edge of the list",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Reorder failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create product form
  const addProductForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      visibility: "public",
      categoryIds: [],
      stockQuantity: 0,
      featured: false,
      hidePrice: false,
      doctorIds: [],
      brand: "",
    },
  });

  // Create product mutation
  const addProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Convert price to cents
      const priceInCents = Math.round(data.price * 100);
      const productData = {
        ...data,
        price: priceInCents,
      };
      const res = await apiRequest("POST", "/api/products", productData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "The product has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      addProductForm.reset();
      
      // If we're on the /admin/products/new route, navigate back to products page
      if (location === "/admin/products/new") {
        navigate("/admin/products");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create product: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Edit product form
  const editProductForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      visibility: "public",
      categoryIds: [],
      stockQuantity: 0,
      featured: false,
      hidePrice: false,
      doctorIds: [],
      brand: "",
    },
  });

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormValues }) => {
      // Convert price to cents
      const priceInCents = Math.round(data.price * 100);
      const productData: Partial<Product> = {
        ...data,
        price: priceInCents,
        variants: variantsToBackend(editVariants),
      };
      const res = await apiRequest("PUT", `/api/products/${id}`, productData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "The product has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update product: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filter products
  const filteredProducts = products.filter(product => {
    if (filterVisibility && product.visibility !== filterVisibility) return false;
    if (filterCategory && !(product.categoryIds || []).includes(filterCategory)) return false;
    if (filterFeatured !== undefined && product.featured !== filterFeatured) return false;
    return true;
  });

  // Format price from cents to dollars
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  // Render visibility badge
  const renderVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Badge variant="public">PUBLIC</Badge>;
      case "member":
        return <Badge variant="member">MEMBERS</Badge>;
      case "doctor":
        return <Badge variant="doctor">DOCTOR</Badge>;
      default:
        return null;
    }
  };

  // Resolve one or more category ids to display names
  const getCategoryNames = (categoryIds: string[]) => {
    return (categoryIds || []).map((id) => {
      const category = categories.find(c => c.id === id);
      return category ? category.name : 'Unknown';
    });
  };

  // Handle delete button click
  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Handle edit button click
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    
    // Convert price from cents to dollars for the form
    const priceInDollars = product.price / 100;
    
    // Set form values
    editProductForm.reset({
      name: product.name,
      description: product.description,
      price: priceInDollars,
      imageUrl: product.imageUrl || "",
      visibility: product.visibility as "public" | "member" | "doctor",
      categoryIds: product.categoryIds || [],
      stockQuantity: product.stockQuantity,
      featured: product.featured,
      hidePrice: product.hidePrice || false,
      doctorIds: product.doctorIds || [],
      brand: product.brand || "",
    });

    // Hydrate variant drafts from the existing product
    setEditVariants(variantsFromBackend(product.variants));
    
    setIsEditDialogOpen(true);
  };

  // Handle add product form submission
  const onAddProductSubmit = (data: ProductFormValues) => {
    addProductMutation.mutate(data);
  };

  // Handle edit product form submission
  const onEditProductSubmit = (data: ProductFormValues) => {
    if (selectedProduct) {
      editProductMutation.mutate({ id: selectedProduct.id, data });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterVisibility(undefined);
    setFilterCategory(undefined);
    setFilterFeatured(undefined);
  };

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-montserrat font-bold text-primary mb-4">Access Denied</h2>
        <p className="text-secondary mb-6">You don't have permission to access the product management.</p>
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mr-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">Product Management</h1>
          <p className="text-secondary">Manage your products, visibility, and inventory</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage your product catalog, visibility, and inventory
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              data-testid="import-catalog-btn"
              title="Replace all products with the consolidated official catalog"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Import Catalog
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 bg-muted/20 p-4 rounded-md">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Visibility</label>
                <Select
                  value={filterVisibility || "all"}
                  onValueChange={(value) => setFilterVisibility(value === "all" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All visibilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visibilities</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="member">Members</SelectItem>
                    <SelectItem value="doctor">Doctors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={filterCategory || "all"}
                  onValueChange={(value) => setFilterCategory(value === "all" ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Featured</label>
                <Select
                  value={filterFeatured === undefined ? "all" : filterFeatured.toString()}
                  onValueChange={(value) => {
                    if (value === "all") setFilterFeatured(undefined);
                    else setFilterFeatured(value === "true");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    <SelectItem value="true">Featured only</SelectItem>
                    <SelectItem value="false">Non-featured only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Products Table */}
          {productsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No products found.</p>
              <Button 
                variant="link" 
                onClick={() => setIsAddDialogOpen(true)}
                className="mt-2"
              >
                Add a product
              </Button>
            </div>
          ) : (
            <>
              {filterCategory && (
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  <span>
                    Use the up/down arrows to reorder products within this category.
                    This affects shop and category-page ordering for customers.
                  </span>
                </p>
              )}
              <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{renderVisibilityBadge(product.visibility)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getCategoryNames(product.categoryIds).map((name) => (
                            <Badge key={name} variant="outline" className="bg-primary/5 text-primary border-primary/30">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{product.stockQuantity}</TableCell>
                      <TableCell>
                        {product.variants && product.variants.length > 0 ? (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
                            {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.featured ? (
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            <Check className="h-3 w-3 mr-1" /> Featured
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            <X className="h-3 w-3 mr-1" /> Not Featured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {filterCategory && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  moveProductMutation.mutate({
                                    id: product.id,
                                    direction: "up",
                                    categoryId: filterCategory,
                                  })
                                }
                                disabled={
                                  moveProductMutation.isPending ||
                                  filteredProducts[0]?.id === product.id
                                }
                                title="Move up"
                                data-testid={`move-up-${product.id}`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  moveProductMutation.mutate({
                                    id: product.id,
                                    direction: "down",
                                    categoryId: filterCategory,
                                  })
                                }
                                disabled={
                                  moveProductMutation.isPending ||
                                  filteredProducts[filteredProducts.length - 1]?.id === product.id
                                }
                                title="Move down"
                                data-testid={`move-down-${product.id}`}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(product)}
                            title="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => handleDeleteClick(product)}
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
          <Button variant="outline" onClick={() => refetchProducts()}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          addProductForm.reset();
          setAddVariants([]);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product for the Exercise Recovery Alliance catalog
            </DialogDescription>
          </DialogHeader>

          <Form {...addProductForm}>
            <form onSubmit={addProductForm.handleSubmit(onAddProductSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={addProductForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Premium Resistance Bands" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addProductForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="29.99"
                          disabled={addVariants.length > 0}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {addVariants.length > 0
                          ? "Auto-derived from variants (lowest price)"
                          : "Enter price in dollars (e.g. 29.99)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addProductForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Professional-grade bands for rehabilitation exercises"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={addProductForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>Full URL (https://...) or relative path (/api/files/...). Leave blank for stock fallback.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addProductForm.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="100"
                          disabled={addVariants.length > 0}
                          {...field}
                        />
                      </FormControl>
                      {addVariants.length > 0 && (
                        <FormDescription>Auto-summed from variant stock</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={addProductForm.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Public
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Members Only
                            </div>
                          </SelectItem>
                          <SelectItem value="doctor">
                            <div className="flex items-center">
                              <EyeOff className="h-4 w-4 mr-2" />
                              Doctors Only
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Who can view and purchase this product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addProductForm.control}
                  name="categoryIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <div className="space-y-2 border rounded-md p-4 max-h-56 overflow-y-auto">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`add-cat-${category.id}`}
                              checked={field.value?.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value || []), category.id]);
                                } else {
                                  field.onChange(
                                    field.value?.filter((id) => id !== category.id) || []
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`add-cat-${category.id}`}
                              className="text-sm leading-none"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormDescription>
                        A product can appear in multiple categories
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addProductForm.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Product</FormLabel>
                      <FormDescription>
                        This product will be displayed prominently on the homepage
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={addProductForm.control}
                name="hidePrice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Provider-Only Pricing</FormLabel>
                      <FormDescription>
                        Product is visible to everyone, but the price is hidden from the
                        general public. Only verified providers (HCPs) see pricing and can
                        purchase.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <VariantEditor value={addVariants} onChange={setAddVariants} />

              {/* Doctor IDs selection - only show if visibility is "doctor" */}
              {addProductForm.watch("visibility") === "doctor" && (
                <FormField
                  control={addProductForm.control}
                  name="doctorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available to Doctors</FormLabel>
                      <div className="space-y-4 border rounded-md p-4">
                        {doctors.map((doctor) => (
                          <div key={doctor.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`doctor-${doctor.id}`}
                              checked={field.value?.includes(doctor.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([
                                    ...(field.value || []),
                                    doctor.id,
                                  ]);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (id) => id !== doctor.id
                                    ) || []
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`doctor-${doctor.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {doctor.doctorTitle} {doctor.fullName} - {doctor.doctorSpecialty}
                            </label>
                          </div>
                        ))}
                        {doctors.length === 0 && (
                          <p className="text-sm text-muted-foreground">No doctors available</p>
                        )}
                      </div>
                      <FormDescription>
                        Select which doctors can sell this product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addProductMutation.isPending}
                >
                  {addProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Product"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details
            </DialogDescription>
          </DialogHeader>

          <Form {...editProductForm}>
            <form onSubmit={editProductForm.handleSubmit(onEditProductSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={editProductForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Premium Resistance Bands" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editProductForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="29.99"
                          disabled={editVariants.length > 0}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {editVariants.length > 0
                          ? "Auto-derived from variants (lowest price)"
                          : "Enter price in dollars (e.g. 29.99)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editProductForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Professional-grade bands for rehabilitation exercises"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={editProductForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>Full URL (https://...) or relative path (/api/files/...). Leave blank for stock fallback.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editProductForm.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="100"
                          disabled={editVariants.length > 0}
                          {...field}
                        />
                      </FormControl>
                      {editVariants.length > 0 && (
                        <FormDescription>Auto-summed from variant stock</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={editProductForm.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Public
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Members Only
                            </div>
                          </SelectItem>
                          <SelectItem value="doctor">
                            <div className="flex items-center">
                              <EyeOff className="h-4 w-4 mr-2" />
                              Doctors Only
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Who can view and purchase this product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editProductForm.control}
                  name="categoryIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <div className="space-y-2 border rounded-md p-4 max-h-56 overflow-y-auto">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-cat-${category.id}`}
                              checked={field.value?.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...(field.value || []), category.id]);
                                } else {
                                  field.onChange(
                                    field.value?.filter((id) => id !== category.id) || []
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`edit-cat-${category.id}`}
                              className="text-sm leading-none"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormDescription>
                        A product can appear in multiple categories
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editProductForm.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Featured Product</FormLabel>
                      <FormDescription>
                        This product will be displayed prominently on the homepage
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={editProductForm.control}
                name="hidePrice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Provider-Only Pricing</FormLabel>
                      <FormDescription>
                        Product is visible to everyone, but the price is hidden from the
                        general public. Only verified providers (HCPs) see pricing and can
                        purchase.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <VariantEditor value={editVariants} onChange={setEditVariants} />

              {/* Doctor IDs selection - only show if visibility is "doctor" */}
              {editProductForm.watch("visibility") === "doctor" && (
                <FormField
                  control={editProductForm.control}
                  name="doctorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available to Doctors</FormLabel>
                      <div className="space-y-4 border rounded-md p-4">
                        {doctors.map((doctor) => (
                          <div key={doctor.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`doctor-edit-${doctor.id}`}
                              checked={field.value?.includes(doctor.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([
                                    ...(field.value || []),
                                    doctor.id,
                                  ]);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (id) => id !== doctor.id
                                    ) || []
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`doctor-edit-${doctor.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {doctor.doctorTitle} {doctor.fullName} - {doctor.doctorSpecialty}
                            </label>
                          </div>
                        ))}
                        {doctors.length === 0 && (
                          <p className="text-sm text-muted-foreground">No doctors available</p>
                        )}
                      </div>
                      <FormDescription>
                        Select which doctors can sell this product
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editProductMutation.isPending}
                >
                  {editProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Product"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 p-4 rounded-md my-4">
            <p className="font-medium">{selectedProduct?.name}</p>
            <p className="text-sm text-muted-foreground">{selectedProduct?.description}</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedProduct && deleteProductMutation.mutate(selectedProduct.id)}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Import Confirmation Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Official Catalog?</DialogTitle>
            <DialogDescription>
              This will <span className="font-semibold text-destructive">delete every existing product</span> in this database and replace it with the consolidated 39-product Active Recovery 360 catalog (with all variants and official imagery).
              <br /><br />
              Categories, users, orders, and HCP applications are <span className="font-semibold">not</span> affected.
              <br /><br />
              Use this once after deploying to a fresh environment, or any time you want to reset the catalog to the official snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={importCatalogMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => importCatalogMutation.mutate()}
              disabled={importCatalogMutation.isPending}
              data-testid="confirm-import-catalog-btn"
            >
              {importCatalogMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Wipe & Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

