"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CourseDetailPage from "@/app/courses/[courseId]/page-client";

function Inner() {
  const courseId = useSearchParams().get("id") ?? "";
  return <CourseDetailPage params={Promise.resolve({ courseId })} />;
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
