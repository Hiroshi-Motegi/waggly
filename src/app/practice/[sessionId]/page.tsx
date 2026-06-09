import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ sessionId: "_" }];
}

export default function Page(props: { params: Promise<{ sessionId: string }> }) {
  return <ClientPage />;
}
