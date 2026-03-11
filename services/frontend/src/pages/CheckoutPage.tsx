import { useState } from 'react';
import { Navigate } from 'react-router';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { CartReviewStep } from '@/components/checkout/CartReviewStep';
import {
  CustomerDetailsStep,
  type CustomerData,
} from '@/components/checkout/CustomerDetailsStep';
import { OrderReviewStep } from '@/components/checkout/OrderReviewStep';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/auth/useAuth';

export function CheckoutPage() {
  const { items } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<CustomerData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    address: '',
  });

  // Redirect to home if cart is empty on initial load
  if (items.length === 0 && step === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutStepper activeStep={step} />

      {step === 0 && <CartReviewStep onNext={() => setStep(1)} />}
      {step === 1 && (
        <CustomerDetailsStep
          data={customer}
          onChange={setCustomer}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <OrderReviewStep customer={customer} onBack={() => setStep(1)} />
      )}
    </div>
  );
}
