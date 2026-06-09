import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export default function Page(props: { params: Promise<{ clubId: string }> }) {
  return <ClientPage params={props.params} />;
}
