"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { formUrlQuery } from "@/lib/utils";

const navButton = "flex h-9 items-center gap-1.5 rounded-lg px-3 text-14 text-ink-2 transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-40";

export const Pagination = ({ page, totalPages }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams()!;

  const handleNavigation = (type: "prev" | "next") => {
    const pageNumber = type === "prev" ? page - 1 : page + 1;

    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "page",
      value: pageNumber.toString(),
    });

    router.push(newUrl, { scroll: false });
  };

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        className={navButton}
        onClick={() => handleNavigation("prev")}
        disabled={Number(page) <= 1}
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        Previous
      </button>
      <p className="figure text-13 text-ink-3">
        {page} of {totalPages}
      </p>
      <button
        type="button"
        className={navButton}
        onClick={() => handleNavigation("next")}
        disabled={Number(page) >= totalPages}
      >
        Next
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </nav>
  );
};
