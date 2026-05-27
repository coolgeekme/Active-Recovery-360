import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft,
  Loader2,
  Mail,
  Trash2,
  Eye,
  EyeOff,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminContactMessagesPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContactMessage | null>(null);

  const { data: messages = [], isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
  });

  const markRead = useMutation({
    mutationFn: async (m: ContactMessage) => {
      const endpoint = m.isRead
        ? `/api/admin/contact-messages/${m.id}/mark-unread`
        : `/api/admin/contact-messages/${m.id}/mark-read`;
      const res = await apiRequest("POST", endpoint);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/contact-messages/unread-count"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/contact-messages/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Message deleted" });
      setConfirmDelete(null);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/contact-messages/unread-count"],
      });
    },
  });

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <Link
        href="/admin"
        className="text-sm text-secondary inline-flex items-center hover:text-primary mb-3"
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Admin
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-primary" />
            <CardTitle>Contact Messages</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-primary hover:bg-primary" data-testid="unread-badge">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {messages.length} total
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-secondary">
              <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p>No contact form submissions yet.</p>
            </div>
          ) : (
            <ul className="divide-y" data-testid="messages-list">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`py-3 px-2 -mx-2 rounded hover:bg-muted/50 cursor-pointer flex items-start gap-3 ${
                    !m.isRead ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setSelected(m);
                    if (!m.isRead) markRead.mutate(m);
                  }}
                  data-testid={`message-row-${m.id}`}
                >
                  <div className="pt-1">
                    {m.isRead ? (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className={`text-sm truncate ${
                          !m.isRead ? "font-semibold text-primary" : "text-secondary"
                        }`}
                      >
                        {m.name}
                      </p>
                      <span className="text-xs text-muted-foreground truncate">
                        {m.email}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate ${
                        !m.isRead ? "font-medium" : "text-secondary"
                      }`}
                    >
                      {m.subject}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {m.message}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(m.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Message detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl" data-testid="message-detail-dialog">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject}</DialogTitle>
                <DialogDescription asChild>
                  <div className="text-sm space-y-1 pt-2">
                    <p>
                      <span className="font-medium text-foreground">
                        {selected.name}
                      </span>{" "}
                      &lt;
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-primary hover:underline"
                      >
                        {selected.email}
                      </a>
                      &gt;
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div
                className="text-sm whitespace-pre-wrap py-4 border-t border-b max-h-[40vh] overflow-y-auto"
                data-testid="message-body"
              >
                {selected.message}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => markRead.mutate(selected)}
                  disabled={markRead.isPending}
                  data-testid="toggle-read-btn"
                >
                  {selected.isRead ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" /> Mark unread
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" /> Mark read
                    </>
                  )}
                </Button>
                <Button asChild variant="default">
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(
                      selected.subject
                    )}`}
                    data-testid="reply-btn"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Reply via email
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(selected)}
                  data-testid="delete-btn"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this message?</DialogTitle>
            <DialogDescription>
              From <strong>{confirmDelete?.name}</strong> — this cannot be undone.
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
              data-testid="confirm-delete-btn"
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
