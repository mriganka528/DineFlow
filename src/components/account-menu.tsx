"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Trash2,
  User,
  Mail,
  Phone,
  Settings,
  Loader2,
  AlertTriangle,
  UserCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { logoutCustomer, deleteCustomerAccount, updateCustomerProfile } from "@/actions/customer-account";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [customerProfile, setCustomerProfile] = useState<{ name: string; email: string; phone: string; avatar?: string } | null>(null);

  // Account Details dialog state
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [accountDetailsLoading, setAccountDetailsLoading] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", email: "", phone: "" });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isDeleting) return;
    document.body.style.overflow = "hidden";
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDeleting]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  // Fetch customer profile on mount
  useEffect(() => {
    if (mounted) {
      fetchCustomerProfile();
    }
  }, [mounted]);

  const fetchCustomerProfile = async () => {
    try {
      const { data } = await api.get("/api/customer/profile");
      if (data.customer) {
        setCustomerProfile({
          name: data.customer.name || "",
          email: data.customer.email || "",
          phone: data.customer.phone || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch customer profile:", error);
    }
  };

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logoutCustomer();
      router.push("/auth");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (isDeleting) return;
    setIsDeleting(true);
    setShowDeleteDialog(false);
    try {
      const result = await deleteCustomerAccount();
      if (result.success) {
        toast.success("Your account has been deleted successfully.");
        router.push("/");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete account. Please try again.");
        setIsDeleting(false);
      }
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  }

  // Handle account details form submission
  const handleAccountDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAccountDetailsLoading(true);
    setAccountErrors({});

    const errors: Record<string, string> = {};
    if (!accountForm.name.trim()) {
      errors.name = "Name is required";
    }
    if (!accountForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountForm.email)) {
      errors.email = "Invalid email format";
    }
    if (!accountForm.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(accountForm.phone.replace(/\D/g, ""))) {
      errors.phone = "Phone must be 10 digits";
    }

    if (Object.keys(errors).length > 0) {
      setAccountErrors(errors);
      setAccountDetailsLoading(false);
      return;
    }

    try {
      const result = await updateCustomerProfile({
        name: accountForm.name.trim(),
        email: accountForm.email.trim(),
        phone: accountForm.phone.trim(),
      });

      if (result.success) {
        toast.success("Profile updated successfully");
        setShowAccountDetails(false);
        router.refresh();
        fetchCustomerProfile();
      } else {
        if (result.errors) {
          setAccountErrors(result.errors);
        } else {
          toast.error(result.message || "Failed to update profile");
        }
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setAccountDetailsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Open handlers
  const handleOpenAccountDetails = () => {
    setOpen(false);
    setAccountForm({
      name: customerProfile?.name || "",
      email: customerProfile?.email || "",
      phone: customerProfile?.phone || "",
    });
    setShowAccountDetails(true);
  };

  if (!mounted) {
    return (
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        className="rounded-full"
      >
        <UserCircle className="size-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <>
      {/* Account Button with Avatar */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        className="relative rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        <Avatar className="size-8 ring-2 ring-border transition-shadow hover:ring-primary/30">
          <AvatarImage src={customerProfile?.avatar || undefined} alt={customerProfile?.name || "User"} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {customerProfile?.name ? getInitials(customerProfile.name) : <UserCircle className="size-4" />}
          </AvatarFallback>
        </Avatar>
      </Button>

      {/* Dropdown Menu */}
      {mounted && open && createPortal(
        <div
          ref={menuRef}
          className={cn(
            "fixed z-50 w-75 rounded-2xl border border-border/60 bg-popover shadow-xl shadow-black/8",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-200"
          )}
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Profile Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-11 ring-2 ring-primary/10">
                <AvatarImage src={customerProfile?.avatar || undefined} alt={customerProfile?.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {customerProfile?.name ? getInitials(customerProfile.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-popover-foreground truncate leading-tight">
                  {customerProfile?.name || "Customer"}
                </p>
                {customerProfile?.email && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {customerProfile.email}
                  </p>
                )}
                {customerProfile?.phone && (
                  <p className="text-xs text-muted-foreground truncate">
                    {customerProfile.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Actions */}
          <div className="p-1.5">
            <button
              onClick={handleOpenAccountDetails}
              disabled={isLoading || accountDetailsLoading}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                "hover:bg-accent active:bg-accent/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50 disabled:pointer-events-none",
                "group"
              )}
              role="menuitem"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Settings className="size-3.5" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-popover-foreground">Account Details</p>
                <p className="text-xs text-muted-foreground truncate">Manage your profile</p>
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                "hover:bg-accent active:bg-accent/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50 disabled:pointer-events-none",
                "group"
              )}
              role="menuitem"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogOut className="size-3.5" />
                )}
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-popover-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground truncate">Log out of your account</p>
              </div>
            </button>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="p-1.5">
            <div className="px-3 py-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-destructive/70">
                <AlertTriangle className="size-3" />
                Danger Zone
              </p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setShowDeleteDialog(true);
              }}
              disabled={isLoading}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                "hover:bg-destructive/8 active:bg-destructive/12",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30",
                "disabled:opacity-50 disabled:pointer-events-none",
                "group"
              )}
              role="menuitem"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructivehover:text-shadow-white">
                <Trash2 className="size-3.5" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-xs text-destructive/60">Permanently remove your data</p>
              </div>
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* Account Details Dialog */}
      <Dialog open={showAccountDetails} onOpenChange={setShowAccountDetails}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Account Details</DialogTitle>
                <DialogDescription className="text-xs">
                  Update your personal information
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleAccountDetailsSubmit}>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="name"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    disabled={accountDetailsLoading}
                    aria-invalid={!!accountErrors.name}
                    className={cn(
                      "pl-9 h-10",
                      accountErrors.name && "border-destructive ring-2 ring-destructive/20"
                    )}
                  />
                </div>
                {accountErrors.name && (
                  <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="size-3" />
                    {accountErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="your@email.com"
                    disabled={accountDetailsLoading}
                    aria-invalid={!!accountErrors.email}
                    className={cn(
                      "pl-9 h-10",
                      accountErrors.email && "border-destructive ring-2 ring-destructive/20"
                    )}
                  />
                </div>
                {accountErrors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="size-3" />
                    {accountErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="phone"
                    type="tel"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    disabled={accountDetailsLoading}
                    aria-invalid={!!accountErrors.phone}
                    className={cn(
                      "pl-9 h-10",
                      accountErrors.phone && "border-destructive ring-2 ring-destructive/20"
                    )}
                  />
                </div>
                {accountErrors.phone && (
                  <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="size-3" />
                    {accountErrors.phone}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="border-t bg-muted/30 px-6 py-4 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAccountDetails(false)} disabled={accountDetailsLoading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={accountDetailsLoading}>
                {accountDetailsLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!isDeleting) setShowDeleteDialog(open);
      }}>
        <AlertDialogContent className="max-w-sm gap-0 overflow-hidden p-0" onEscapeKeyDown={(e) => { if (isDeleting) e.preventDefault(); }}>
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <div className="space-y-1.5">
                <AlertDialogTitle className="text-lg font-semibold">Delete Account?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently remove your account, orders, addresses, reviews, and all personal data. This action cannot be undone.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t bg-muted/30 px-6 py-4 gap-2 sm:justify-center">
            <AlertDialogCancel disabled={isDeleting} className="flex-1 sm:flex-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex-1 sm:flex-none bg-destructive text-destructive-foreground hover:bg-destructive/90 mb-4"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-screen deletion overlay */}
      {isDeleting && mounted && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <Loader2 className="size-10 animate-spin text-primary" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Deleting your account...
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Please wait while we securely remove your account and personal data. This may take a few moments.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
