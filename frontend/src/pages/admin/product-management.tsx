import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Product, Category, InsertProduct, User } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
  Filter
} from "lucide-react";

// Create a schema for the product form based on the InsertProduct type
const productFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  price: z.coerce.number().min(1, "Price must be at least 1 cent"),
  imageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  visibility: z.enum(["public", "member", "doctor"], {
    required_error: "Visibility is required",
  }),
  categoryId: z.coerce.number({
    required_error: "Category is required",
  }),
  stockQuantity: z.coerce.number().min(0, "Stock quantity cannot be negative"),
  featured: z.boolean().default(false),
  doctorIds: z.array(z.string()).optional(),
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
  const [filterCategory, setFilterCategory] = useState<number | undefined>(undefined);
  const [filterFeatured, setFilterFeatured] = useState<boolean | undefined>(undefined);

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
    mutationFn: async (productId: number) => {
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

  // Create product form
  const addProductForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      visibility: "public",
      categoryId: undefined,
      stockQuantity: 0,
      featured: false,
      doctorIds: [],
    },
  });

  // Create product mutation
  const addProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Convert price to cents
      const priceInCents = Math.round(data.price * 100);
      const productData: InsertProduct = {
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
      categoryId: undefined,
      stockQuantity: 0,
      featured: false,
      doctorIds: [],
    },
  });

  // Edit product mutation
  const editProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductFormValues }) => {
      // Convert price to cents
      const priceInCents = Math.round(data.price * 100);
      const productData: Partial<Product> = {
        ...data,
        price: priceInCents,
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
    if (filterCategory && product.categoryId !== filterCategory) return false;
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

  // Find category by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
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
      categoryId: product.categoryId,
      stockQuantity: product.stockQuantity,
      featured: product.featured,
      doctorIds: product.doctorIds || [],
    });
    
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
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Product
          </Button>
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
                  value={filterCategory?.toString() || "all"}
                  onValueChange={(value) => setFilterCategory(value === "all" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
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
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
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
                      <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                      <TableCell>{product.stockQuantity}</TableCell>
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
                        <div className="flex justify-end gap-2">
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
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Enter price in dollars (e.g. 29.99)</FormDescription>
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
                      <FormDescription>Enter a valid URL for the product image</FormDescription>
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
                          {...field}
                        />
                      </FormControl>
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
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                              checked={field.value?.includes(doctor.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([
                                    ...(field.value || []),
                                    doctor.id.toString(),
                                  ]);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (id) => id !== doctor.id.toString()
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
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Enter price in dollars (e.g. 29.99)</FormDescription>
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
                      <FormDescription>Enter a valid URL for the product image</FormDescription>
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
                          {...field}
                        />
                      </FormControl>
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
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                              checked={field.value?.includes(doctor.id.toString())}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([
                                    ...(field.value || []),
                                    doctor.id.toString(),
                                  ]);
                                } else {
                                  field.onChange(
                                    field.value?.filter(
                                      (id) => id !== doctor.id.toString()
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
    </div>
  );
}
