import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RecoveryService } from "@/types/recovery-service";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminRecoveryServicesPage() {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<RecoveryService | null>(null);

  const { data: services = [], isLoading } = useQuery<RecoveryService[]>({
    queryKey: ["/api/admin/recovery-services"],
  });

  const togglePublish = useMutation({
    mutationFn: async (s: RecoveryService) => {
      const endpoint =
        s.status === "published"
          ? `/api/admin/recovery-services/${s.id}/unpublish`
          : `/api/admin/recovery-services/${s.id}/publish`;
      const res = await apiRequest("POST", endpoint);
      return await res.json();
    },
    onSuccess: (_d, s) => {
      toast({
        title: s.status === "published" ? "Unpublished" : "Published",
        description: s.status === "published"
          ? "Service hidden from the directory."
          : "Service is now live for members.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recovery-services"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/recovery-services/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Service deleted" });
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recovery-services"] });
    },
  });

  return (
    <div className="container mx-auto py-10 px-4">
      <Link
        href="/admin"
        className="text-sm text-secondary inline-flex items-center hover:text-primary mb-3"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Admin
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recovery Services</CardTitle>
          <Button asChild data-testid="add-service-btn">
            <Link href="/admin/recovery-services/new">
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : services.length === 0 ? (
            <p className="text-secondary py-8 text-center">
              No services yet. Add the first one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.category}</TableCell>
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.locations.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {s.memberDiscount?.text || "—"}
                    </TableCell>
                    <TableCell>
                      {s.status === "published" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-500">
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish.mutate(s)}
                        disabled={togglePublish.isPending}
                        title={s.status === "published" ? "Unpublish" : "Publish"}
                        data-testid={`toggle-publish-${s.id}`}
                      >
                        {s.status === "published" ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button asChild variant="ghost" size="sm" title="Edit">
                        <Link href={`/admin/recovery-services/${s.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setConfirmDelete(s)}
                        title="Delete"
                        data-testid={`delete-service-${s.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this service?</DialogTitle>
            <DialogDescription>
              <strong>{confirmDelete?.name}</strong> will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDelete && deleteMutation.mutate(confirmDelete.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
