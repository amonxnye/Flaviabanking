"use client";
import { Check, Copy as CopyIcon } from "lucide-react";
import { useState } from "react";

const Copy = ({ title }: { title: string }) => {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(title);
    setHasCopied(true);

    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  return (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
      onClick={copyToClipboard}
      aria-label={hasCopied ? "Shareable ID copied" : "Copy shareable ID"}
    >
      <span className="figure line-clamp-1 flex-1 text-left text-12 text-ink-2">
        {title}
      </span>
      {hasCopied ? (
        <Check size={16} strokeWidth={1.5} aria-hidden="true" className="text-positive" />
      ) : (
        <CopyIcon size={16} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  );
};

export default Copy;
