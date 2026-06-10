import type { Metadata } from "next";
import AdminClient from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin · Homes — Maharack Heights",
  robots: { index: false, follow: false },
};

export default function AdminHomesPage() {
  return <AdminClient />;
}
