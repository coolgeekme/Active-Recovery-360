import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ArrowLeft, 
  Tag, 
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const discountFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  description: z.string().min(1, "Description is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0.01, "Value must be greater than 0"),
  usageLimit: z.number().min(1, "Usage limit must be at least 1").optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
});

type DiscountFormData = z.infer<typeof discountFormSchema>;

interface DiscountCode {
  id: number;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function DiscountManagement() {
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: discountCodes = [], isLoading, error } = useQuery<DiscountCode[]>({
    queryKey: ["/api/discount-codes"],
  });

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 0,
      usageLimit: undefined,
      expiresAt: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DiscountFormData) => {
      const submitData = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      };
      return apiRequest("POST", "/api/discount-codes", submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discount-codes"] });
      toast({
        title: "Success",
        description: "Discount code created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create discount code",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: DiscountFormData & { id: number }) => {
      const { id, ...updateData } = data;
      const submitData = {
        ...updateData,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt).toISOString() : null,
      };
      return apiRequest("PUT", `/api/discount-codes/${id}`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discount-codes"] });
      toast({
        title: "Success",
        description: "Discount code updated successfully",
      });
      setIsDialogOpen(false);
      setEditingDiscount(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update discount code",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/discount-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discount-codes"] });
      toast({
        title: "Success",
        description: "Discount code deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete discount code",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    if (editingDiscount) {
      updateMutation.mutate({ ...data, id: editingDiscount.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (discount: DiscountCode) => {
    setEditingDiscount(discount);
    form.reset({
      code: discount.code,
      description: discount.description,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      usageLimit: discount.usageLimit || undefined,
      expiresAt: discount.expiresAt ? format(new Date(discount.expiresAt), "yyyy-MM-dd") : "",
      isActive: discount.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this discount code?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingDiscount(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Discount code "${code}" copied to clipboard`,
    });
  };

  const getStatusBadge = (discount: DiscountCode) => {
    if (!discount.isActive) {
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    if (discount.expiresAt && new Date() > new Date(discount.expiresAt)) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Used Up</Badge>;
    }
    return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600">Error loading discount codes. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-montserrat font-bold text-primary mb-1">Discount Codes</h1>
            <p className="text-secondary">Create and manage promotional discount codes</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} className="mt-4 md:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Discount Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDiscount ? "Edit Discount Code" : "Add New Discount Code"}
              </DialogTitle>
              <DialogDescription>
                {editingDiscount 
                  ? "Update the discount code details below"
                  : "Create a new promotional discount code"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="SAVE20" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique code customers will enter
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="20% off membership upgrade" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="20"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of times this code can be used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Enable this discount code
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingDiscount ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Discount Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Discount Codes ({discountCodes.length})
          </CardTitle>
          <CardDescription>
            Manage promotional codes for membership upgrades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discountCodes.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No discount codes found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first discount code to offer promotions
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Discount Code
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountCodes.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {discount.code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(discount.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {discount.description}
                      </TableCell>
                      <TableCell>
                        {discount.discountType === "percentage" 
                          ? `${discount.discountValue}%` 
                          : `$${discount.discountValue}`
                        }
                      </TableCell>
                      <TableCell>
                        {discount.usageLimit 
                          ? `${discount.usedCount}/${discount.usageLimit}`
                          : `${discount.usedCount} uses`
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(discount)}
                      </TableCell>
                      <TableCell>
                        {discount.expiresAt 
                          ? format(new Date(discount.expiresAt), "MMM dd, yyyy")
                          : "No expiry"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(discount)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(discount.id)}
                            disabled={deleteMutation.isPending}
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
      </Card>
    </div>
  );
}