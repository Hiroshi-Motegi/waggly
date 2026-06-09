import ClientPage from "./page-client";

export function generateStaticParams() {
  return [];
}

export default function Page(props: { params: Promise<{ planId: string }> }) {
  return <ClientPage params={props.params} />;
}
