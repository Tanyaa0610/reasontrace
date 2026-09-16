import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/lib/ui/buttonStyles";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium text-accent">ReasonTrace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight leading-tight text-foreground">
          Understand the mistake. Not just the answer.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          ReasonTrace finds recurring reasoning patterns in student work and
          turns them into targeted practice.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/diagnostic" className={buttonPrimary}>
          Try a diagnostic
        </Link>
        <Link href="/dashboard" className={buttonSecondary}>
          View dashboard
        </Link>
      </div>
    </div>
  );
}
