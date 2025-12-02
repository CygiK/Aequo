import  type { Route } from "./+types/dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Aequo" },
    { name: "description", content: "Dashboard page of Aequo project" },
  ];
}

export default function Dashboard() {
  return <div>Dashboard</div>;
}