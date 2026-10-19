/**
 * 10 · Brand. Everything falls away but India's outline. The name, the
 * site's own tagline, and its address. The line under the name is the film's
 * line, one last time. Held long enough to read.
 */
import { AbsoluteFill } from 'remotion';
import { HERO_TAGLINE, SITE_ADDRESS } from '../data/site';
import { TYPE, COLOR, ink } from '../styles/tokens';
import { useTime, prog } from '../utils/anim';
import { MaskLine, Chars, Rule } from '../components/type/Type';

const X = 880;

export function S10Brand() {
  const t = useTime();
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: X, top: 330 }}>
        <div style={{ ...TYPE.title, fontSize: 116, color: COLOR.ink, whiteSpace: 'nowrap' }}>
          <Chars text="India Species Atlas" t={t} start={0.9} stagger={0.028} dur={0.9} />
        </div>
        <Rule p={prog(t, 1.5, 1.3, 'cinema')} width={900} color={ink(0.55)} style={{ marginTop: 34 }} />
        <div style={{ marginTop: 34 }}>
          {HERO_TAGLINE.map((line, i) => (
            <MaskLine key={line} p={prog(t, 2.0 + i * 0.3, 1.0)}>
              <div style={{ ...TYPE.italic, fontSize: 40, color: ink(i ? 0.66 : 0.86), lineHeight: 1.3 }}>{line}</div>
            </MaskLine>
          ))}
        </div>
        <div style={{ ...TYPE.micro, fontSize: 17, letterSpacing: '0.14em', textTransform: 'none', color: COLOR.ink, marginTop: 54, opacity: prog(t, 2.9, 0.9) }}>
          {SITE_ADDRESS}
        </div>
      </div>
    </AbsoluteFill>
  );
}
