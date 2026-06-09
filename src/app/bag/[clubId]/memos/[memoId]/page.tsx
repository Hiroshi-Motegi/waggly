import ClientPage from "./page-client";

export function generateStaticParams() {
  return [];
}

export default function Page(props: { params: Promise<{ clubId: string; memoId: string }> }) {
  return <ClientPage params={props.params} />;
}
