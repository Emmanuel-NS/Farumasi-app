import { cn } from "@/lib/utils";

interface FarumasiLogoProps {
  size?: number;
  className?: string;
  onDark?: boolean;
}

/**
 * FARUMASI leafy-F logo — mirrors the Flutter CustomPainter version.
 * onDark=true  → white circle bg, green leafy-F inside (for use on dark/green backgrounds)
 * onDark=false → transparent bg, green leafy-F (for use on light backgrounds)
 */
export function FarumasiLogo({ size = 32, className, onDark = false }: FarumasiLogoProps) {
  const green = "#1e9e68";
  // Arc calculated from Flutter: Rect(0,0,100,100), startAngle=0.8rad, sweep=5.0rad
  // Start  (0.8 rad):  x=50+50·cos(0.8)≈84.8,  y=50+50·sin(0.8)≈85.9
  // End  (5.8 rad):    x=50+50·cos(5.8)≈94.2,  y=50+50·sin(5.8)≈26.7
  // Sweep > π → large-arc-flag=1, clockwise → sweep-flag=1
  const arcD = "M84.8,85.9 A50,50 0 1 1 94.2,26.7";

  // Leafy wings translated from Flutter quadraticBezierTo coordinates (0-100 scale)
  const topWing  = "M28,55 Q20,20 85,22 Q55,35 45,45 Z";
  const botWing  = "M32,65 Q45,50 80,50 Q60,60 40,70 Z";

  if (onDark) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
      >
        {/* White circle background with subtle shadow filter */}
        <circle cx="50" cy="50" r="46" fill="white" />
        {/* Arc swoosh */}
        <path d={arcD} stroke={green} strokeWidth="8" strokeLinecap="round" />
        {/* Leafy F wings */}
        <path d={topWing} fill={green} />
        <path d={botWing} fill={green} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Arc swoosh */}
      <path d={arcD} stroke={green} strokeWidth="8" strokeLinecap="round" />
      {/* Leafy F wings */}
      <path d={topWing} fill={green} />
      <path d={botWing} fill={green} />
    </svg>
  );
}
