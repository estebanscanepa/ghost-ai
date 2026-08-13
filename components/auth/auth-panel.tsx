import { FileText, Ghost, Sparkles, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description:
      "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
  },
];

interface AuthPanelProps {
  /** The Clerk form — `<SignIn />` or `<SignUp />`. */
  children: ReactNode;
}

/**
 * Shell shared by the sign-in and sign-up routes. An even split on large
 * screens: the product panel sits on `bg-elevated` so it reads as its own
 * surface against the near-black form side. Below `lg` the panel is supporting
 * context, not content, so it drops out entirely rather than stacking.
 */
export function AuthPanel({ children }: AuthPanelProps) {
  return (
    <div className="flex flex-1 bg-base">
      <aside className="hidden w-1/2 flex-col justify-between border-r border-surface-border bg-elevated px-14 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
            <Ghost className="h-5 w-5 text-background" />
          </span>
          <span className="font-semibold tracking-tight text-copy-primary">
            Ghost AI
          </span>
        </div>

        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-copy-primary">
            Design systems at the
            <br />
            speed of thought.
          </h1>

          <p className="mt-5 text-copy-muted">
            Describe your architecture in plain English. Ghost AI maps it to a
            shared canvas your whole team can refine in real time.
          </p>

          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
                  <Icon className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <p className="font-medium text-copy-primary">{title}</p>
                  <p className="mt-1 text-sm text-copy-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">
          © {new Date().getFullYear()} Ghost AI. All rights reserved.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
