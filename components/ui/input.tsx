import * as React from "react"
import { cn } from "@/lib/utils"

// The current interface is causing the error:
// export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   // Add any additional props here
//   customProp?: string;
// }

// To fix this, you have two options:
// We'll use Option 2 to keep the interface with additional props
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  customProp?: string;
  // Add any other custom props here if needed
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
