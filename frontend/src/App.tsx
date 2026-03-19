import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Providers
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";

// Pages
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ShopPage from "@/pages/shop-page";
import MembershipPage from "@/pages/membership-page";
import MembershipCheckoutPage from "@/pages/membership-checkout-page";
import ProductPage from "@/pages/product-page";
import DoctorStorefrontPage from "@/pages/doctor-storefront-page";
import DoctorsPage from "@/pages/doctors-page";
import CheckoutPage from "@/pages/checkout-page";
import AccountPage from "@/pages/account-page";
import OrdersPage from "@/pages/account/orders-page";
import AboutPage from "@/pages/about-page";
import CategoryPage from "@/pages/category-page";
import AdminPage from "@/pages/admin/admin-page";
import ProductManagement from "@/pages/admin/product-management";
import OrderManagement from "@/pages/admin/order-management";
import CategoryManagement from "@/pages/admin/category-management";
import UserManagement from "@/pages/admin/user-management";
import AdminSettings from "@/pages/admin/admin-settings";
import DiscountManagement from "@/pages/admin/discount-management";
import HcpManagement from "@/pages/admin/hcp-management";

// Components
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

// Protected Routes
import { ProtectedRoute } from "@/lib/protected-route";

function AppRouter() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/membership" component={MembershipPage} />
          <Route path="/membership/checkout" component={MembershipCheckoutPage} />
          <Route path="/membership-checkout" component={MembershipCheckoutPage} />
          <Route path="/product/:id" component={ProductPage} />
          <Route path="/doctors" component={DoctorsPage} />
          <Route path="/doctors/:id" component={DoctorStorefrontPage} />
          <Route path="/category/:id" component={CategoryPage} />
          <Route path="/about" component={AboutPage} />
          
          {/* Protected routes */}
          <ProtectedRoute path="/checkout" component={CheckoutPage} requireMember={true} />
          <ProtectedRoute path="/account" component={AccountPage} />
          <ProtectedRoute path="/account/orders" component={OrdersPage} />
          <ProtectedRoute path="/admin" component={AdminPage} requireAdmin={true} />
          <ProtectedRoute path="/admin/products" component={ProductManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/products/new" component={ProductManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/orders" component={OrderManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/categories" component={CategoryManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/users" component={UserManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/discounts" component={DiscountManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/hcp" component={HcpManagement} requireAdmin={true} />
          <ProtectedRoute path="/admin/settings" component={AdminSettings} requireAdmin={true} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <AppRouter />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
