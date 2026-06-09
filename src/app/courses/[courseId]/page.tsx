import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ courseId: "_" }];
}

export default function Page(props: { params: Promise<{ courseId: string }> }) {
  return <ClientPage params={props.params} />;
}
