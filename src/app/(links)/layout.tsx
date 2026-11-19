import { OwnerBar } from "@/components/OwnerBar";

export default function LinksLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="links-page">{children}</main>
      <OwnerBar />
    </>
  );
}
