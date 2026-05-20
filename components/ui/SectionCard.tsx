"use client";

import { Card, CardContent } from "@heroui/react";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <Card className={`bg-[rgba(13,13,26,0.6)] backdrop-blur-md border border-[rgba(0,255,255,0.3)] relative overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.15),inset_0_0_30px_rgba(255,0,255,0.05)] ${className}`}>
      <CardContent className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
        {children}
      </CardContent>
    </Card>
  );
}
