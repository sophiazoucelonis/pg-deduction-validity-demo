import { Wrench } from "lucide-react";
import { MODULE_RADIUS, CIRCLE_CENTER_OFFSET } from "./DraggableFlowModule";

interface Position {
  x: number;
  y: number;
}

interface FlowConnectionProps {
  from: Position;
  to: Position;
  fromColor?: string;
  toColor?: string;
}

export function FlowConnection({ from, to }: FlowConnectionProps) {
  // Adjust positions to center on the circle (not the whole module including text)
  const fromCircle = { x: from.x, y: from.y + CIRCLE_CENTER_OFFSET };
  const toCircle = { x: to.x, y: to.y + CIRCLE_CENTER_OFFSET };
  
  // Calculate the edge points of the circles
  const dx = toCircle.x - fromCircle.x;
  const dy = toCircle.y - fromCircle.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < MODULE_RADIUS * 2 + 20) {
    // Modules are too close, don't render connection
    return null;
  }
  
  // Normalize direction
  const nx = dx / distance;
  const ny = dy / distance;
  
  // Start point: edge of source module + docker width
  const dockerOffset = MODULE_RADIUS + 8;
  const startX = fromCircle.x + nx * dockerOffset;
  const startY = fromCircle.y + ny * dockerOffset;
  
  // End point: edge of target module - docker width
  const endX = toCircle.x - nx * dockerOffset;
  const endY = toCircle.y - ny * dockerOffset;
  
  // Middle point for the wrench icon (offset perpendicular to the line)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Perpendicular offset for wrench icon (so it doesn't break the line)
  const perpX = -ny * 20; // Offset perpendicular to line direction
  const perpY = nx * 20;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
    >
      {/* Single straight dashed line */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="5"
        strokeOpacity="0.35"
        strokeDasharray="10 8"
        strokeLinecap="round"
      />
      
      {/* Wrench icon floating beside the line */}
      <g transform={`translate(${midX + perpX}, ${midY + perpY})`}>
        {/* Background circle */}
        <circle
          cx="0"
          cy="0"
          r="12"
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        
        {/* Wrench icon */}
        <g transform="translate(-6, -6)">
          <path
            d="M9.5 2.5L8 4l1.5 1.5L8 7 6.5 5.5 5 7 3.5 5.5 5 4l2-2 2.5.5zM3 8l-.5.5a1.5 1.5 0 0 0 2 2L5 10l1.5-1.5L5 7 3 8z"
            fill="hsl(var(--muted-foreground))"
            transform="scale(1.1)"
          />
        </g>
      </g>
    </svg>
  );
}
