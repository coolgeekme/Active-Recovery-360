
import logoImage from "@/assets/era-logo.jpeg";

interface ERALogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function ERALogo({ className = "", width, height, ...props }: ERALogoProps) {
  return (
    <img
      src={logoImage}
      alt="Exercise Recovery Alliance Logo"
      className={className}
      width={width}
      height={height}
      {...props}
    />
  );
}
