import { cn } from "@/lib/utils";

interface ImigongoChatBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

/** Dense imigongo + medical doodle wallpaper — clearly visible but behind content. */
export function ImigongoChatBackground({
  children,
  className,
}: ImigongoChatBackgroundProps) {
  const logo = (x: number, y: number, scale: number, color: string, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M84.8,85.9 A50,50 0 1 1 94.2,26.7"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M28,55 Q20,20 85,22 Q55,35 45,45 Z" fill={color} />
      <path d="M32,65 Q45,50 80,50 Q60,60 40,70 Z" fill={color} />
    </g>
  );

  return (
    <div
      className={cn("relative bg-[#E2EBE6]", className)}
      aria-hidden={children ? undefined : true}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern
            id="farumasi-imigongo"
            width="220"
            height="220"
            patternUnits="userSpaceOnUse"
          >
            <rect width="220" height="220" fill="#E2EBE6" />
            <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.36">
              {/* Imigongo lines */}
              <path d="M8 14 L22 10 L36 16 L50 11 L64 15" stroke="#F2E8DA" strokeWidth="1.4" />
              <path d="M72 8 L86 14 L100 9 L114 15" stroke="#D4C4A8" strokeWidth="1.3" />
              <path d="M130 12 L144 8 L158 14 L172 10 L186 14 L200 11" stroke="#8FB89A" strokeWidth="1.3" />
              <path d="M16 40 L28 52 L16 64 L4 52 Z M34 40 L46 52 L34 64 L22 52 Z M52 40 L64 52 L52 64 L40 52 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <circle cx="98" cy="38" r="4" stroke="#6FAF88" strokeWidth="1.2" />
              <circle cx="98" cy="38" r="9" stroke="#6FAF88" strokeWidth="1.2" />
              <circle cx="98" cy="38" r="14" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M128 24 L138 34 L128 44 L118 34 Z M128 29 L133 34 L128 39 L123 34 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M168 18 L188 18 L188 38 L176 38 L176 26 L184 26 L184 30 L180 30 L180 34 L168 34 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M12 88 L32 68 M24 88 L44 68" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M58 78 A12 12 0 0 1 82 78 M64 82 A6 6 0 0 1 76 82" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M96 70 V98 M82 84 H110" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M118 72 V100 M118 80 L106 92 M118 86 L130 78 M118 92 L110 100" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M148 78 L160 78 L160 98 L152 98 L152 86 L156 86 L156 90 L152 90 L152 94 L148 94 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M178 74 L182 74 L182 86 L180 88 L180 96 L178 96 L178 88 L176 86 L176 74 Z M178 88 L184 96" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M196 82 L204 82 L204 94 L196 94 Z M200 82 L200 74" stroke="#8FB89A" strokeWidth="1.2" />
              {/* Medical icons */}
              <rect x="14" y="108" width="6" height="16" rx="1" stroke="#6FAF88" strokeWidth="1.2" />
              <rect x="20" y="112" width="16" height="12" rx="3" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M28 108 L28 104 M26 104 L30 104" stroke="#6FAF88" strokeWidth="1.2" />
              <rect x="48" y="114" width="22" height="8" rx="4" stroke="#F2E8DA" strokeWidth="1.2" />
              <line x1="54" y1="114" x2="54" y2="122" stroke="#F2E8DA" strokeWidth="1.2" />
              <line x1="64" y1="114" x2="64" y2="122" stroke="#F2E8DA" strokeWidth="1.2" />
              <rect x="82" y="112" width="26" height="10" rx="5" stroke="#D4C4A8" strokeWidth="1.2" />
              <line x1="95" y1="112" x2="95" y2="122" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M118 108 L128 118 L118 128 L108 118 Z M118 113 L123 118 L118 123 L113 118 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M142 118 L148 108 L154 118 L148 128 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M168 120 L174 120 L171 108 L168 120 L165 120" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M186 114 L202 114 L198 124 L190 124 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M8 148 L24 148 L20 136 L12 136 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M34 144 L50 144 L46 132 L38 132 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M58 148 L74 148 L70 136 L62 136 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M86 140 L102 140 L98 128 L90 128 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M110 148 L126 148 L122 136 L114 136 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M138 140 L154 140 L150 128 L142 128 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M162 148 L178 148 L174 136 L166 136 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M186 140 L202 140 L198 128 L190 128 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M10 172 L26 172 L22 160 L14 160 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M36 176 L52 176 L48 164 L40 164 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M62 170 L78 170 L74 158 L66 158 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M88 176 L104 176 L100 164 L92 164 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M114 172 L130 172 L126 160 L118 160 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M140 176 L156 176 L152 164 L144 164 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M166 170 L182 170 L178 158 L170 158 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M192 176 L208 176 L204 164 L196 164 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M20 196 L36 196 L32 184 L24 184 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M46 200 L62 200 L58 188 L50 188 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M72 194 L88 194 L84 182 L76 182 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M98 200 L114 200 L110 188 L102 188 Z" stroke="#8FB89A" strokeWidth="1.2" />
              <path d="M124 196 L140 196 L136 184 L128 184 Z" stroke="#6FAF88" strokeWidth="1.2" />
              <path d="M150 200 L166 200 L162 188 L154 188 Z" stroke="#F2E8DA" strokeWidth="1.2" />
              <path d="M176 194 L192 194 L188 182 L180 182 Z" stroke="#D4C4A8" strokeWidth="1.2" />
              <path d="M4 118 L20 118 L16 106 L8 106 Z" stroke="#F2E8DA" strokeWidth="1.1" />
              <path d="M200 58 L216 58 L212 46 L204 46 Z" stroke="#8FB89A" strokeWidth="1.1" />
              {/* Farumasi logos — 8+ per tile */}
              {logo(18, 22, 0.14, "#F2E8DA", "l1")}
              {logo(52, 14, 0.13, "#D4C4A8", "l2")}
              {logo(88, 20, 0.15, "#8FB89A", "l3")}
              {logo(128, 12, 0.14, "#F2E8DA", "l4")}
              {logo(168, 24, 0.13, "#6FAF88", "l5")}
              {logo(198, 16, 0.12, "#D4C4A8", "l6")}
              {logo(24, 58, 0.14, "#8FB89A", "l7")}
              {logo(72, 52, 0.13, "#F2E8DA", "l8")}
              {logo(118, 48, 0.15, "#6FAF88", "l9")}
              {logo(162, 56, 0.14, "#D4C4A8", "l10")}
              {logo(200, 44, 0.12, "#8FB89A", "l11")}
              {logo(14, 98, 0.13, "#F2E8DA", "l12")}
              {logo(56, 92, 0.14, "#6FAF88", "l13")}
              {logo(100, 88, 0.13, "#D4C4A8", "l14")}
              {logo(144, 96, 0.15, "#8FB89A", "l15")}
              {logo(188, 90, 0.14, "#F2E8DA", "l16")}
              {logo(32, 138, 0.13, "#D4C4A8", "l17")}
              {logo(76, 132, 0.14, "#8FB89A", "l18")}
              {logo(120, 140, 0.13, "#F2E8DA", "l19")}
              {logo(164, 134, 0.15, "#6FAF88", "l20")}
              {logo(206, 128, 0.12, "#D4C4A8", "l21")}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#farumasi-imigongo)" />
      </svg>
      {children ? (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">{children}</div>
      ) : null}
    </div>
  );
}
