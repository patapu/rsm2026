"use client";

import { Card, CardContent } from "@heroui/react";

interface SubCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Inner card used inside `SectionCard` for per-item emphasis (projects,
 * experience, etc.). Uses a 10% tint of the secondary color as background
 * and a thicker border for visual hierarchy.
 */
export default function SubCard({ children, className = "" }: SubCardProps) {
  return (
    <Card
      className={`border-[2.5px] border-secondary bg-[color-mix(in_srgb,var(--color-secondary)_10%,transparent)] ${className}`}
    >
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
}
