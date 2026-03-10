import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CustomerData {
  name: string;
  email: string;
  address: string;
}

interface CustomerDetailsStepProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onNext: () => void;
  onBack: () => void;
}

const EMAIL_STORAGE_KEY = 'cloudmart-email';

export function CustomerDetailsStep({
  data,
  onChange,
  onNext,
  onBack,
}: CustomerDetailsStepProps) {
  // Pre-fill email from localStorage on mount
  useEffect(() => {
    if (!data.email) {
      try {
        const savedEmail = localStorage.getItem(EMAIL_STORAGE_KEY);
        if (savedEmail) {
          onChange({ ...data, email: savedEmail });
        }
      } catch {
        // ignore
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Save email for future use
    try {
      localStorage.setItem(EMAIL_STORAGE_KEY, data.email);
    } catch {
      // ignore
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Customer Details</h2>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-name">Full Name</Label>
          <Input
            id="customer-name"
            type="text"
            required
            placeholder="John Doe"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            required
            placeholder="john@example.com"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-address">Shipping Address</Label>
          <textarea
            id="customer-address"
            required
            placeholder="123 Main St, City, State ZIP"
            value={data.address}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            rows={3}
            className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="cursor-pointer"
        >
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="min-h-[44px] cursor-pointer"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
