import { StatusExplainer } from '../components/conservation/StatusExplainer';
import { ProgrammesList } from '../components/conservation/ProgrammesList';
import { ThreatsOverview } from '../components/conservation/ThreatsOverview';
import { ConservationTimeline } from '../components/conservation/ConservationTimeline';
import { SectionHeading } from '../components/ui/SectionHeading';
import ChartsPanel from '../components/charts/DataCharts';

export function ConservationPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:space-y-20 lg:py-16">
      <StatusExplainer />

      <section>
        <SectionHeading
          eyebrow="Data"
          title="The selection in numbers"
          description="Charts computed from the atlas dataset."
        />
        <div className="mt-6">
          <ChartsPanel variant="full" />
        </div>
      </section>

      <ThreatsOverview />
      <ConservationTimeline />
      <ProgrammesList />
    </div>
  );
}
