export function AdminFormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#e5e5e5] p-4 space-y-3">
      <h3 className="text-sm font-bold text-[#006728]">{title}</h3>
      {children}
    </div>
  );
}
