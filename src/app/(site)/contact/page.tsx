import type { Metadata } from "next";
import { ContactBlock } from "@/components/ContactBlock";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Contact</h1>
      <ContactBlock />
    </div>
  );
}
