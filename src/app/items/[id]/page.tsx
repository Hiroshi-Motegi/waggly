import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <ClientPage params={props.params} />;
}
