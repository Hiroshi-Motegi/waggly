import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ clubId: "_", maintenanceId: "_" }];
}

export default function Page(props: { params: Promise<{ clubId: string; maintenanceId: string }> }) {
  return <ClientPage params={props.params} />;
}
