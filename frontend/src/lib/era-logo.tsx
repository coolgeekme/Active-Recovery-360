
import logoImage from "../assets/Logo_6_v2_Final.png";

interface AR360LogoProps {
  className?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function AR360Logo({ className = "", width, height, style, ...props }: AR360LogoProps) {
  return (
    <img
      src={logoImage}
      alt="Active Recovery 360 Logo"
      className={`${className}`}
      width={width}
      height={height}
      style={{ 
        imageRendering: 'crisp-edges',
        ...style 
      }}
      {...props}
    />
  );
}

// Keep the old name for backwards compatibility during transition
export const ERALogo = AR360Logo;
