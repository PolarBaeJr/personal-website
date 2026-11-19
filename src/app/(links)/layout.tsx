import { OwnerBar } from "@/components/OwnerBar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LinksLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="links-page">
        <ThemeToggle className="links-theme" />
        {children}
      </main>
      <OwnerBar />
    </>
  );
}
