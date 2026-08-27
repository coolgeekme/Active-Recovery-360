import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, CheckIcon, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocation } from "wouter";

interface MembershipFormProps {
  onSuccess?: () => void;
}

const membershipFormSchema = z.object({
  paymentMethod: z.enum(["credit", "paypal"]),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  discountCode: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val, {
    message: "You must accept the terms and conditions",
  }),
});

type MembershipFormValues = z.infer<typeof membershipFormSchema>;

export default function MembershipForm({ onSuccess }: MembershipFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [originalAmount] = useState(29);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues: {
      paymentMethod: "credit",
      discountCode: "",
      acceptTerms: false,
    },
  });

  const paymentMethod = watch("paymentMethod");
  const discountCode = watch("discountCode");

  // Calculate final amount
  const calculateFinalAmount = () => {
    if (!appliedDiscount) return originalAmount;
    
    if (appliedDiscount.discountType === "percentage") {
      return originalAmount - (originalAmount * appliedDiscount.discountValue / 100);
    } else {
      // Fixed discount (in cents, convert to dollars)
      return Math.max(0, originalAmount - (appliedDiscount.discountValue / 100));
    }
  };
  
  const finalAmount = calculateFinalAmount();

  // Apply discount code
  const applyDiscountCode = async () => {
    if (!discountCode?.trim()) {
      toast({
        title: "Please enter a discount code",
        variant: "destructive",
      });
      return;
    }
    
    setDiscountLoading(true);
    try {
      const response = await apiRequest("POST", "/api/discount-codes/validate", {
        code: discountCode.trim().toUpperCase()
      });
      const data = await response.json();
      
      if (data.valid) {
        setAppliedDiscount(data.discountCode);
        toast({
          title: "Discount Applied!",
          description: `You saved $${(originalAmount - calculateFinalAmount()).toFixed(2)}`,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Invalid discount code";
      toast({
        title: "Discount Code Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDiscountLoading(false);
    }
  };
  
  // Remove applied discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
    setValue("discountCode", "");
    toast({
      title: "Discount Removed",
    });
  };

  const onSubmit = async (data: MembershipFormValues) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to purchase a membership",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    try {
      setIsPending(true);
      
      // In a real application, this would process payment and then update membership status
      // For this demo, we'll just update the membership status directly
      await apiRequest("POST", "/api/membership/purchase", {
        discountCode: appliedDiscount?.code
      });
      
      toast({
        title: "Membership purchased!",
        description: "Welcome to Active Recovery 360!",
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to process membership payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  if (user?.isMember) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">You're Already a Member!</CardTitle>
          <CardDescription className="text-center">
            Thank you for being part of Active Recovery 360.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="bg-primary/10 rounded-full p-4 mb-4">
            <CheckIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="text-center text-muted-foreground">
            You already have full access to all member benefits and exclusive products.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/shop")}>
            Browse Member-Only Products
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Become a Member</CardTitle>
        <CardDescription className="text-center">
          Join our recovery community for a one-time fee of $29
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="membership-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="bg-primary bg-opacity-5 p-4 rounded mb-4">
              <div className="flex items-center mb-2">
                <CheckIcon className="h-5 w-5 text-primary mr-2" />
                <span className="text-primary font-semibold">
                  {appliedDiscount ? (
                    <>
                      <span className="line-through text-gray-500 mr-2">${originalAmount}</span>
                      <span>${finalAmount.toFixed(2)}</span>
                    </>
                  ) : (
                    `One-time payment of $${originalAmount}`
                  )}
                </span>
              </div>
              <div className="flex items-center mb-2">
                <CheckIcon className="h-5 w-5 text-primary mr-2" />
                <span className="text-primary">FREE Recovery Kit ($39 value)</span>
              </div>
              <div className="flex items-center">
                <CheckIcon className="h-5 w-5 text-primary mr-2" />
                <span className="text-primary">Lifetime access to member products</span>
              </div>
            </div>

            {/* Applied Discount Display */}
            {appliedDiscount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        {appliedDiscount.code}
                      </div>
                      <div className="text-xs text-green-700">
                        {appliedDiscount.description}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeDiscount}
                    className="text-green-600 hover:text-green-800 hover:bg-green-100 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-green-800">
                  Discount: ${(originalAmount - finalAmount).toFixed(2)} off
                </div>
              </div>
            )}

            {/* Discount Code Section */}
            {!appliedDiscount && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Have a discount code?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter discount code"
                    {...register("discountCode")}
                    className="flex-1 border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyDiscountCode();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={applyDiscountCode}
                    disabled={discountLoading || !discountCode?.trim()}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {discountLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="font-medium text-sm">Payment Method</div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="credit"
                    {...register("paymentMethod")}
                    className="text-primary"
                  />
                  <span>Credit Card</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value="paypal"
                    {...register("paymentMethod")}
                    className="text-primary"
                  />
                  <span>PayPal</span>
                </label>
              </div>
            </div>

            {paymentMethod === "credit" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    {...register("cardNumber")}
                    className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      {...register("expiryDate")}
                      className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      {...register("cvv")}
                      className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("acceptTerms")}
                  className="mt-1 text-primary"
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-red-500 text-sm mt-1">{errors.acceptTerms.message}</p>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-primary text-white py-3 rounded font-montserrat font-semibold hover:bg-opacity-90 transition"
          disabled={isPending}
          type="submit"
          form="membership-form"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Join Now for $${finalAmount.toFixed(2)}`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
