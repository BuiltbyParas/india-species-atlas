import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { Check, Copy, QrCode } from 'lucide-react';
import { STATUS_INFO } from '../../data/statusInfo';
import {
  conservationRegionCount,
  countByStatus,
  statesCovered,
  totalSpecies,
} from '../../utils/stats';
import { SectionHeading } from '../ui/SectionHeading';

function CaptureCard() {
  const byStatus = countByStatus();
  return (
    <div
      id="atlas-capture"
      className="overflow-hidden rounded-2xl border border-forest-700 bg-gradient-to-br from-forest-900 to-forest-950 p-6 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-400">India Species Atlas</p>
      <h3 className="mt-2 font-serif text-2xl font-semibold text-canvas sm:text-3xl">
        Mapping Endangered Species &amp; Their Conservation Status in India
      </h3>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {(['CR', 'EN', 'VU'] as const).map((code) => (
          <div key={code} className="rounded-lg border border-forest-700/70 bg-forest-900/70 py-3">
            <p className="font-serif text-2xl font-semibold" style={{ color: STATUS_INFO[code].colorVar }}>
              {byStatus[code]}
            </p>
            <p className="text-[11px] font-medium text-canvas/70">{STATUS_INFO[code].name}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-canvas/70">
        <span><strong className="text-canvas">{totalSpecies}</strong> species</span>
        <span><strong className="text-canvas">{conservationRegionCount}</strong> ecological regions</span>
        <span><strong className="text-canvas">{statesCovered().length}</strong> states &amp; UTs</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-forest-700/60 pt-4">
        {(['CR', 'EN', 'VU'] as const).map((code) => (
          <span key={code} className="inline-flex items-center gap-1.5 text-xs text-canvas/70">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_INFO[code].colorVar }} />
            {code} — {STATUS_INFO[code].name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ShareCard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrOk, setQrOk] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const href = window.location.origin + import.meta.env.BASE_URL;
    setUrl(href);
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        href,
        { width: 176, margin: 1, color: { dark: '#0f1f17', light: '#f6f4ec' } },
        (err) => setQrOk(!err),
      );
    }
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-forest-700 bg-forest-900 p-6 text-center">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-forest-400">
        <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
        Scan to explore the interactive atlas
      </p>
      <div className="mt-4 rounded-xl bg-canvas p-3">
        {qrOk ? (
          <canvas ref={canvasRef} width={176} height={176} aria-label="QR code linking to this site" />
        ) : (
          <p className="w-44 p-6 text-xs text-ink">QR code unavailable — use the link below.</p>
        )}
      </div>
      <p className="mt-3 max-w-[16rem] break-all text-xs text-canvas/55">{url || 'Deploy the site to generate a link'}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-forest-600 px-3 py-1.5 text-xs font-medium text-canvas hover:bg-forest-800"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <p className="mt-3 text-[11px] leading-snug text-canvas/45">
        The QR code is generated from the live address in your browser, so it always points to wherever this
        atlas is deployed.
      </p>
    </div>
  );
}

export function PresentationSection() {
  return (
    <section className="border-t border-forest-800 bg-forest-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="For presentations &amp; reports"
          title="A snapshot you can capture"
          description="This panel is designed to be screenshotted for slides, posters or an Instagram post. The interactive map itself is one tap away."
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <CaptureCard />
          <ShareCard />
        </div>
        <div className="mt-6">
          <Link
            to="/atlas"
            className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-400"
          >
            Open the interactive map
          </Link>
        </div>
      </div>
    </section>
  );
}
