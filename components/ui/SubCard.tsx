"use client";

import { Card, CardContent } from "@heroui/react";

interface SubCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Inner card used inside `SectionCard` for per-item emphasis (projects,
 * experience, etc.). Uses a magenta neon border and translucent background
 * for visual hierarchy.
 */
export default function SubCard({ children, className = "" }: SubCardProps) {
  return (
    <Card
      className={`border-[1.5px] border-[rgba(255,0,255,0.4)] bg-[rgba(255,0,255,0.04)] shadow-[0_0_8px_rgba(255,0,255,0.2),inset_0_0_15px_rgba(255,0,255,0.05)] transition-shadow duration-300 hover:shadow-[0_0_15px_rgba(255,0,255,0.4),inset_0_0_15px_rgba(255,0,255,0.08)] ${className}`}
    >
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
}
