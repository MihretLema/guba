import Link from "next/link";
import { DeveloperCredit } from "./DeveloperCredit";
export default function NotFound() {
  return <main className="content-detail"><article><h1>Page not found.</h1><p>The page you’re looking for is unavailable.</p><Link href="/">Return to GUBA →</Link></article><footer className="detail-credit"><DeveloperCredit /></footer></main>;
}
