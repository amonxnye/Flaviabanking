import { categoryColors } from "@/constants";
import { cn } from "@/lib/utils";

const Category = ({ category }: CategoryProps) => {
  const share = category.totalCount ? (category.count / category.totalCount) * 100 : 0;

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-14">
        <span className={cn("status-dot", categoryColors[category.name] || categoryColors.default)} aria-hidden="true" />
        <span className="flex-1 truncate text-ink">{category.name}</span>
        <span className="figure text-13 text-ink-3">{category.count}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label={category.name} aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[#3F3F46]" style={{ width: `${share}%` }} />
      </div>
    </li>
  );
};

export default Category;
