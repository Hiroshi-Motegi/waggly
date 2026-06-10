import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ username: "_" }];
}

export default function Page(props: { params: Promise<{ username: string }> }) {
  return <ClientPage params={props.params} />;
}
