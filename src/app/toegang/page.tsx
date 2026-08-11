import { ToegangForm } from "@/components/shared/ToegangForm";

export const dynamic = "force-dynamic";

/** E-mail-toegangspoort voor de bèta. */
export default async function ToegangPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Toegang tot de SpatialLab-bèta</h1>
      <p className="mt-3 text-muted">
        SpatialLab is nog in besloten bèta. Laat je e-mail achter, dan krijg je een link om binnen
        te komen. We sturen je één mail — geen wachtwoord nodig.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-line p-3 text-sm">
          Die link is verlopen of ongeldig. Vraag hieronder een nieuwe aan.
        </p>
      )}
      <div className="mt-6">
        <ToegangForm />
      </div>
    </main>
  );
}
