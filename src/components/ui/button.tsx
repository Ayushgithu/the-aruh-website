import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md",
        outline: "border border-line bg-card text-ink hover:border-primary/40 hover:bg-primary-faint hover:text-primary",
        ghost: "text-body hover:bg-primary-faint hover:text-primary",
        soft: "bg-primary-faint text-primary hover:bg-primary-soft",
        whatsapp: "bg-whatsapp text-white shadow-sm hover:brightness-95 hover:shadow-md",
        danger: "bg-red-600 text-white hover:bg-red-700",
        dangerSoft: "bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: {
        sm: "min-h-9 px-3.5 text-sm",
        md: "min-h-11 px-5 text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "h-11 w-11",
        iconSm: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
