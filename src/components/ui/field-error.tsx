export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}
