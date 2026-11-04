import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="px-4">
        <EmptyState image="/images/illustrations/not-found-404.png" title="We could not find that page">
          <p>It may have moved, or the dish may be out of season.</p>
          <LinkButton href="/menu" className="mt-4">
            Back to the menu
          </LinkButton>
        </EmptyState>
      </main>
      <Footer />
    </>
  );
}
