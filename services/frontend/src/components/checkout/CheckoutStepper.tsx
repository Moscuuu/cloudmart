import { Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const STEPS = ['Cart Review', 'Customer Details', 'Confirm Order'] as const;

interface CheckoutStepperProps {
  activeStep: number;
}

export function CheckoutStepper({ activeStep }: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;

          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'border-2 border-primary bg-background text-primary'
                        : 'border border-border bg-muted text-muted-foreground'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`hidden text-sm font-medium sm:inline ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <Separator className="flex-1" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
