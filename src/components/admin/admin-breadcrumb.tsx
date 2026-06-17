import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function AdminBreadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="text-xs text-[#888] mb-2">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1">&gt;</span>}
          {item.href ? (
            <Link href={item.href} className="text-[#006728] hover:underline">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
