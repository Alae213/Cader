"use client";

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md";
}

// Level color based on level number
const getLevelColor = (level: number): string => {
  switch (level) {
    case 1:
      return "bg-gray-500/20 text-gray-400";
    case 2:
      return "bg-green-500/20 text-green-400";
    case 3:
      return "bg-blue-500/20 text-blue-400";
    case 4:
      return "bg-purple-500/20 text-purple-400";
    case 5:
      return "bg-amber-500/20 text-amber-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
};

export function LevelBadge({ level, size = "sm" }: LevelBadgeProps) {
  const colorClass = getLevelColor(level);
  
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5" 
    : "text-xs px-2 py-1";

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${colorClass}`}
    >
      Level {level}
    </span>
  );
}
