export function ProcessVisual() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 520"
      className="h-auto w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="24" y="24" width="512" height="472" rx="32" fill="var(--color-surface)" />
      <rect x="24.75" y="24.75" width="510.5" height="470.5" rx="31.25" stroke="var(--color-border)" strokeWidth="1.5" />

      <path d="M280 152V205" stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M280 293V340" stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M280 340C280 373 152 365 152 404" stroke="var(--color-border)" strokeWidth="3" strokeLinecap="round" />
      <path d="M280 340V404" stroke="var(--color-border)" strokeWidth="3" strokeLinecap="round" />
      <path d="M280 340C280 373 408 365 408 404" stroke="var(--color-border)" strokeWidth="3" strokeLinecap="round" />

      <rect x="100" y="68" width="360" height="84" rx="18" fill="var(--color-brand-primary-subtle)" />
      <circle cx="140" cy="110" r="18" fill="var(--color-brand-primary)" />
      <path d="M133 110H147M140 103V117" stroke="var(--color-text-on-dark)" strokeWidth="2.5" strokeLinecap="round" />
      <text x="172" y="105" fill="var(--color-brand-dark)" fontSize="15" fontWeight="700" fontFamily="Segoe UI, sans-serif">
        Uw vraag of situatie
      </text>
      <text x="172" y="127" fill="var(--color-text-secondary)" fontSize="13" fontFamily="Segoe UI, sans-serif">
        U beschrijft wat er speelt
      </text>

      <rect x="116" y="205" width="328" height="88" rx="18" fill="var(--color-surface-subtle)" stroke="var(--color-brand-primary)" strokeWidth="1.5" />
      <circle cx="160" cy="249" r="20" fill="var(--color-surface)" stroke="var(--color-brand-primary)" strokeWidth="2" />
      <path d="M151 249L157 255L169 242" stroke="var(--color-brand-primary-hover)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="196" y="244" fill="var(--color-brand-dark)" fontSize="15" fontWeight="700" fontFamily="Segoe UI, sans-serif">
        Vraagverheldering en advies
      </text>
      <text x="196" y="266" fill="var(--color-text-secondary)" fontSize="13" fontFamily="Segoe UI, sans-serif">
        Eerst de passende oplossing bepalen
      </text>

      <g>
        <rect x="88" y="404" width="128" height="60" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
        <circle cx="116" cy="434" r="12" fill="var(--color-brand-primary-subtle)" />
        <path d="M110 435L114 439L122 430" stroke="var(--color-brand-primary-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="136" y="439" fill="var(--color-brand-dark)" fontSize="13" fontWeight="700" fontFamily="Segoe UI, sans-serif">Specialist 1</text>
      </g>
      <g>
        <rect x="216" y="404" width="128" height="60" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
        <circle cx="244" cy="434" r="12" fill="var(--color-brand-primary-subtle)" />
        <path d="M238 435L242 439L250 430" stroke="var(--color-brand-primary-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="264" y="439" fill="var(--color-brand-dark)" fontSize="13" fontWeight="700" fontFamily="Segoe UI, sans-serif">Specialist 2</text>
      </g>
      <g>
        <rect x="344" y="404" width="128" height="60" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
        <circle cx="372" cy="434" r="12" fill="var(--color-brand-primary-subtle)" />
        <path d="M366 435L370 439L378 430" stroke="var(--color-brand-primary-hover)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="392" y="439" fill="var(--color-brand-dark)" fontSize="13" fontWeight="700" fontFamily="Segoe UI, sans-serif">Specialist 3</text>
      </g>

      <rect x="199" y="322" width="162" height="36" rx="18" fill="var(--color-success)" />
      <text x="280" y="345" textAnchor="middle" fill="var(--color-text-on-dark)" fontSize="13" fontWeight="700" fontFamily="Segoe UI, sans-serif">
        Maximaal drie matches
      </text>
    </svg>
  )
}
