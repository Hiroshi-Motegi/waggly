import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ clubId: "_", memoId: "_" }];
}

export default function Page(props: { params: Promise<{ clubId: string; memoId: string }> }) {
  return <ClientPage params={props.params} />;
}
