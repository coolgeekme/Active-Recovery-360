import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { 
  ShoppingCart, 
  Menu, 
  X, 
  User,
  LogIn,
  LogOut,
  UserPlus,
  ShoppingBag,
  Home,
  Heart,
  Users,
  MapPin
} from "lucide-react";
import { ERALogo } from "@/lib/era-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CartDrawer from "@/components/cart/cart-drawer";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { cartItems } = useCart();
  const [location] = useLocation();

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const navigationLinks = [
    { name: "HOME", href: "/", icon: <Home className="h-5 w-5 mr-2" /> },
    { name: "SHOP", href: "/shop", icon: <ShoppingBag className="h-5 w-5 mr-2" /> },
    { name: "MEMBERSHIP", href: "/membership", icon: <Heart className="h-5 w-5 mr-2" /> },
    { name: "PROVIDER SIGN UP", href: "/doctors", icon: <Users className="h-5 w-5 mr-2" /> },
    { name: "WHOLESALE", href: "/wholesale", icon: <ShoppingBag className="h-5 w-5 mr-2" /> },
    { name: "AFFILIATES", href: "/affiliates", icon: <Users className="h-5 w-5 mr-2" /> },
    { name: "RECOVERY SERVICES", href: "/recovery-services", icon: <MapPin className="h-5 w-5 mr-2" /> },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between min-h-[60px]">
          {/* Logo */}
          <Link href="/" className="flex items-center py-2">
            <ERALogo className="h-10 w-auto object-contain max-w-[200px] md:max-w-[250px]" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-6">
            {navigationLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className={`${
                  isActive(link.href) 
                    ? "text-primary font-montserrat font-bold text-sm tracking-wide" 
                    : "text-secondary font-montserrat font-bold text-sm tracking-wide hover:text-primary transition"
                }`}
                data-testid={`link-${link.name.toLowerCase().replace(/ /g, '-')}`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span className="font-montserrat">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href="/account">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:block">
                <Link href="/auth">
                  <Button className="bg-primary text-white font-montserrat font-semibold hover:bg-opacity-90 transition">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}

            <CartDrawer />

            <button 
              className="lg:hidden p-2" 
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              data-testid="button-menu"
            >
              <Menu className="h-6 w-6 text-secondary" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <div className="flex flex-col h-full py-6">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center py-2" onClick={() => setIsMenuOpen(false)}>
                <ERALogo className="h-8 w-auto object-contain max-w-[180px]" />
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 mt-2">
              {navigationLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center px-2 py-2 rounded-md ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-secondary hover:bg-muted hover:text-primary"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="mt-auto space-y-4">
              {user ? (
                <>
                  <div className="px-2 py-2 border-t border-gray-200 pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Signed in as</p>
                    <p className="font-medium text-primary">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="space-y-2">
                    {user.isAdmin && (
                      <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="outline" className="w-full justify-start">
                          <User className="h-5 w-5 mr-2" />
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    <Link href="/account" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start">
                        <User className="h-5 w-5 mr-2" />
                        My Account
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 px-2">
                  <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="default" className="w-full justify-start">
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth?tab=register" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="h-5 w-5 mr-2" />
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
