import { Hero } from '../components/home/Hero';
import { StatsSection } from '../components/home/StatsSection';
import { FeaturedSpecies } from '../components/home/FeaturedSpecies';
import { PresentationSection } from '../components/home/PresentationSection';
import { SectionHeading } from '../components/ui/SectionHeading';
import ChartsPanel from '../components/charts/DataCharts';

export function HomePage() {
  return (
    <>
      <Hero />
      <StatsSection />
      <FeaturedSpecies />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="At a glance"
          title="What the selection looks like"
          description="These charts summarise the atlas dataset. They are recalculated whenever the species data changes — no numbers are hard-coded."
        />
        <div className="mt-9">
          <ChartsPanel variant="mini" />
        </div>
      </section>

      <PresentationSection />
    </>
  );
}
