import ClientPage from "./page-client";

export function generateStaticParams() {
  return [];
}

export default function Page(props: { params: Promise<{ sessionId: string }> }) {
  return <ClientPage />;
}
