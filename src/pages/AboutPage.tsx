import { Link } from 'react-router-dom';
import { SectionHeading } from '../components/ui/SectionHeading';
import { totalSpecies, conservationRegionCount, statesCovered } from '../utils/stats';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-forest-700/70 bg-forest-900 p-5">
      <h3 className="font-serif text-lg font-semibold text-canvas">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-canvas/75">{children}</div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <SectionHeading
        as="h1"
        size="page"
        eyebrow="About this project"
        title="An educational atlas of India’s threatened wildlife"
        description="A student project for an environmental-studies / Computer-Aided Instruction (CAI) assignment."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card title="Purpose">
          <p>
            To visually connect the <em>geography</em> of {totalSpecies} selected threatened species in India
            with their <em>conservation status</em>, the <em>threats</em> they face and the{' '}
            <em>conservation efforts</em> responding to them — so that extinction risk is not an abstract label
            but something tied to real places and real pressures.
          </p>
        </Card>
        <Card title="Target audience">
          <p>
            Students, educators and anyone interested in Indian biodiversity. The language is kept concise and
            non-technical, and every claim links to a source for readers who want to go further.
          </p>
        </Card>
        <Card title="How the selection was made">
          <p>
            Rather than attempting every threatened species in India, the atlas uses a small set chosen for{' '}
            <strong>geographic spread</strong> across {conservationRegionCount} ecological regions and{' '}
            {statesCovered().length} states and union territories, and for a mix of IUCN categories (CR, EN,
            VU) and animal groups (mammals, birds, a reptile).
          </p>
          <p>Quality and accuracy were prioritised over the number of entries.</p>
        </Card>
        <Card title="How the data was checked">
          <p>
            Conservation status for every species was checked against the <strong>IUCN Red List</strong> (via
            the <strong>BirdLife International</strong> Data Zone for birds). Distribution, threats and
            conservation information draw on the IUCN assessments, the Ministry of Environment, Forest and
            Climate Change, the Wildlife Institute of India, the NTCA and WWF India, among others.
          </p>
          <p>Each species entry lists its own sources and the date it was last checked.</p>
        </Card>
      </div>

      <div className="mt-8 rounded-xl border-l-2 border-forest-400 bg-forest-800/50 p-5">
        <h3 className="font-serif text-lg font-semibold text-canvas">Limitations</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-canvas/75">
          <li>
            The map is an <strong>educational representation</strong>. Markers are indicative locations within a
            known range — usually a well-known protected area — and do <strong>not</strong> show exact
            population boundaries or the full range of a species.
          </li>
          <li>
            It is not a substitute for official species distribution datasets (for example those of the WII,
            the Zoological Survey of India or the IUCN range polygons).
          </li>
          <li>
            The state boundary layer is a simplified open dataset and predates some recent state
            reorganisations, so a few boundaries are approximate and Telangana and Ladakh are shown within
            their former parent states.
          </li>
          <li>
            IUCN categories describe <strong>global</strong> extinction risk, not the size or trend of the
            Indian population specifically.
          </li>
          <li>The atlas is deliberately small; it is a teaching tool, not a complete inventory.</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/atlas" className="rounded-lg bg-forest-500 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-400">
          Explore the map
        </Link>
        <Link to="/sources" className="rounded-lg border border-forest-600 px-5 py-3 text-sm font-semibold text-canvas hover:bg-forest-900">
          See all sources
        </Link>
      </div>
    </div>
  );
}
