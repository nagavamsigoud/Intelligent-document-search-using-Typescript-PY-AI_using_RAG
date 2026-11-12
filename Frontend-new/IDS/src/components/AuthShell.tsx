import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  footer: ReactNode;
  children: ReactNode;
};

export default function AuthShell({ eyebrow, title, footer, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-900 px-5 py-10 text-slate-900">

      <div className="mx-auto grid min-h-[85vh] max-w-6xl overflow-hidden rounded-[2rem] border border-stone-300 bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-800 p-8 text-white md:p-12">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
              Intelligent Document Search
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
              Grounded answers from your documents, not guesses.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-emerald-50/80">
              Upload files, index their content, search with natural language, and view answers with citations.
              This frontend is written in React with TypeScript and Tailwind utility classes.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-4">
              <p className="text-sm text-emerald-100/70">Mode</p>
              <p className="mt-2 text-lg font-semibold">Document, Hybrid, General</p>
            </div>
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-4">
              <p className="text-sm text-emerald-100/70">Search</p>
              <p className="mt-2 text-lg font-semibold">GPT + pgvector</p>
            </div>
            <div className="rounded-3xl border border-emerald-100/10 bg-white/10 p-4">
              <p className="text-sm text-emerald-100/70">Output</p>
              <p className="mt-2 text-lg font-semibold">Answers with citations</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-cyan-50 p-6 md:p-10">

          <div className="w-full max-w-md rounded-[2rem] border border-cyan-100 bg-white p-8 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-4xl font-semibold text-stone-950">{title}</h2>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-stone-600">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
