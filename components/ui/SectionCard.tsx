"use client";

import { Card, CardContent } from "@heroui/react";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ children, className = "" }: SectionCardProps) {
  return (
    <Card className={`bg-default-100 ${className}`}>
      <CardContent className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
        {children}
      </CardContent>
    </Card>
  );
}
