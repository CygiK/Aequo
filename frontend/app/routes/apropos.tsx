import { type Route } from "./+types/apropos";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Apropos - Aequo" },
    { name: "description", content: "Apropos page of Aequo project" },
  ];
}

export default function Apropos() {
  return <div>Apropos</div>;
}