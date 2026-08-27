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
import AdminLoginPage from "@/pages/admin-login-page";
import ShopPage from "@/pages/shop-page";
import MembershipPage from "@/pages/membership-page";
import MembershipCheckoutPage from "@/pages/membership-checkout-page";
import MembershipSuccessPage from "@/pages/membership-success-page";
import ProductPage from "@/pages/product-page";
import DoctorStorefrontPage from "@/pages/doctor-storefront-page";
import DoctorsPage from "@/pages/doctors-page";
import CheckoutPage from "@/pages/checkout-page";
import AccountPage from "@/pages/account-page";
import OrdersPage from "@/pages/account/orders-page";
import AboutPage from "@/pages/about-page";
import ContactPage from "@/pages/contact-page";
import AffiliatesPage from "@/pages/affiliates-page";
import WholesalePage from "@/pages/wholesale-page";
import TeamsTrainersPage from "@/pages/teams-trainers-page";
import ReturnsPage from "@/pages/returns-page";
import ShippingPage from "@/pages/shipping-page";
import CategoryPage from "@/pages/category-page";
import AdminPage from "@/pages/admin/admin-page";
import ProductManagement from "@/pages/admin/product-management";
import OrderManagement from "@/pages/admin/order-management";
import CategoryManagement from "@/pages/admin/category-management";
import UserManagement from "@/pages/admin/user-management";
import AdminSettings from "@/pages/admin/admin-settings";
import DiscountManagement from "@/pages/admin/discount-management";
import HcpManagement from "@/pages/admin/hcp-management";
import HcpStorefrontPage from "@/pages/hcp-storefront-page";
import HcpDashboardPage from "@/pages/hcp-dashboard-page";
import AdminHcpStorefrontEditPage from "@/pages/admin/hcp-storefront-edit-page";
import RecoveryServicesPage from "@/pages/recovery-services-page";
import RecoveryServiceDetailPage from "@/pages/recovery-service-detail-page";
import AdminRecoveryServicesPage from "@/pages/admin/recovery-services-page";
import AdminRecoveryServiceFormPage from "@/pages/admin/recovery-service-form-page";
import AdminContactMessagesPage from "@/pages/admin/contact-messages-page";

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
          <Route path="/admin-login" component={AdminLoginPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/shop" component={ShopPage} />
          <Route path="/membership" component={MembershipPage} />
          <Route path="/membership/checkout" component={MembershipCheckoutPage} />
          <Route path="/membership-checkout" component={MembershipCheckoutPage} />
          <Route path="/membership-success" component={MembershipSuccessPage} />
          <Route path="/product/:id" component={ProductPage} />
          <Route path="/doctors" component={DoctorsPage} />
          <Route path="/doctors/:id" component={DoctorStorefrontPage} />
          <Route path="/category/:id" component={CategoryPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/affiliates" component={AffiliatesPage} />
          <Route path="/wholesale" component={WholesalePage} />
          <Route path="/teams-trainers" component={TeamsTrainersPage} />
          <Route path="/returns" component={ReturnsPage} />
          <Route path="/shipping" component={ShippingPage} />

          {/* HCP Storefronts (public) */}
          <Route path="/hcp/dashboard" component={HcpDashboardPage} />
          <Route path="/hcp/:slug" component={HcpStorefrontPage} />

          {/* Recovery Services directory */}
          <Route path="/recovery-services" component={RecoveryServicesPage} />
          <Route path="/recovery-services/:id" component={RecoveryServiceDetailPage} />
          
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
          <ProtectedRoute path="/admin/hcp/:userId/storefront" component={AdminHcpStorefrontEditPage} requireAdmin={true} />
          <ProtectedRoute path="/admin/recovery-services" component={AdminRecoveryServicesPage} requireAdmin={true} />
          <ProtectedRoute path="/admin/recovery-services/new" component={AdminRecoveryServiceFormPage} requireAdmin={true} />
          <ProtectedRoute path="/admin/recovery-services/:id/edit" component={AdminRecoveryServiceFormPage} requireAdmin={true} />
          <ProtectedRoute path="/admin/contact-messages" component={AdminContactMessagesPage} requireAdmin={true} />
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
