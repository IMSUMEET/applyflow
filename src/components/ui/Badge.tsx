import { cn } from "@/utils/cn";

type Color = "blue" | "green" | "yellow" | "red" | "gray" | "purple";

const colorStyles: Record<Color, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
};

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = "gray", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        colorStyles[color],
        className
      )}
    >
      {children}
    </span>
  );
}
