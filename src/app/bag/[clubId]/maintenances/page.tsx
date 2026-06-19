import { Suspense } from "react";
import ClientPage from "./page-client";

export function generateStaticParams() {
  return [{ clubId: "_" }];
}

export default function Page(props: { params: Promise<{ clubId: string }> }) {
  return <Suspense><ClientPage params={props.params} /></Suspense>;
}
