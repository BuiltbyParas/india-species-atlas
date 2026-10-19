import lpuLogo from '../../assets/brand/lpu-logo.webp';

/** Width of the credit plus its gap, kept in step with the wordmark offset in Navbar. */
export const LPU_CREDIT_OFFSET = 'lg:ml-[8rem]';

/**
 * Lovely Professional University's mark: a quiet, viewport-fixed credit at the
 * header's left margin. Desktop only. The header's wordmark steps aside for it.
 */
export function LpuCredit() {
  return (
    <img
      src={lpuLogo}
      alt="Lovely Professional University"
      className="lpu-credit"
      width={108}
      draggable={false}
    />
  );
}
