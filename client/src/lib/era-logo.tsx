
import logoImage from "@/assets/era-logo.jpg";

interface AR360LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function AR360Logo({ className = "", width, height, ...props }: AR360LogoProps) {
  return (
    <img
      src={logoImage}
      alt="Active Recovery 360 Logo"
      className={className}
      width={width}
      height={height}
      {...props}
    />
  );
}

// Keep the old name for backwards compatibility during transition
export const ERALogo = AR360Logo;
