import React from "react";

interface StaggerInProps {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}

export function StaggerIn({ show, className = "", children }: StaggerInProps) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
}
