import { DestinationGrid } from "@/components/DestinationGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteHeader } from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      <SiteHeader />
      <HowItWorks />
      <DestinationGrid />
      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/50">
        Travel agent powered by AI SDK + tool calling. Photos: Wikipedia page image,
        then Unsplash search for the same place name.
      </footer>
    </main>
  );
}
