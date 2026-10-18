function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const skins = ["#f2c9a5", "#e6b089", "#c78b62", "#9a6648", "#f6d7bc"];
const hairs = ["#2b211c", "#4a2f24", "#6b432b", "#1f2b33", "#8a5a37"];
const shirts = ["#0f766e", "#2563eb", "#b45309", "#475569", "#b42318", "#6d5bd0"];
const backgrounds = ["#e6f4f0", "#eaf0ff", "#fdf1df", "#fdeceb", "#eef2ef", "#f2edff"];

export function CartoonAvatar({
  name,
  size = 36,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hash = hashString(name);
  const skin = skins[hash % skins.length];
  const hair = hairs[(hash >>> 3) % hairs.length];
  const shirt = shirts[(hash >>> 6) % shirts.length];
  const background = backgrounds[(hash >>> 9) % backgrounds.length];
  const hairStyle = (hash >>> 12) % 3;
  const glasses = (hash >>> 15) % 4 === 0;
  const earring = (hash >>> 17) % 5 === 0;
  const smile = (hash >>> 19) % 2 === 0;
  const clipId = `avatar-clip-${hash.toString(36)}`;

  return (
    <svg
      className={`cartoon-avatar ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${name}的卡通头像`}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <circle cx="50" cy="50" r="48" fill={background} />
        <circle cx="50" cy="48" r="38" fill="#ffffff" opacity="0.22" />

        <path d="M17 101c2-17 14-26 33-26s31 9 33 26Z" fill={shirt} />
        <path d="M40 76c2 7 5 10 10 12 5-2 8-5 10-12l7 4-5 21H38l-5-21Z" fill="#ffffff" opacity="0.9" />
        <rect x="43" y="64" width="14" height="14" rx="4" fill={skin} />
        <ellipse cx="50" cy="78" rx="17" ry="4" fill="#000000" opacity="0.08" />

        <circle cx="26" cy="50" r="5" fill={skin} />
        <circle cx="74" cy="50" r="5" fill={skin} />
        <ellipse cx="50" cy="45" rx="24" ry="27" fill={skin} />

        {hairStyle === 0 ? (
          <path
            d="M26 45c0-16 10-27 24-27 15 0 25 11 25 27-6-8-14-12-24-11-9 0-16 3-22 12-1-1-2-1-3-1Z"
            fill={hair}
          />
        ) : null}
        {hairStyle === 1 ? (
          <>
            <path
              d="M27 44c0-15 9-26 23-26 14 0 24 9 25 25-4-5-9-8-14-8-8 0-13 4-19 8-5 4-9 4-15 1Z"
              fill={hair}
            />
            <path d="M62 18c8 4 12 11 12 20-3-7-9-11-16-12Z" fill={hair} />
          </>
        ) : null}
        {hairStyle === 2 ? (
          <>
            <circle cx="50" cy="17" r="8" fill={hair} />
            <path
              d="M27 45c0-15 9-25 23-25 15 0 24 10 24 25-6-7-13-10-24-9-10 0-17 3-23 9Z"
              fill={hair}
            />
            <path d="M28 37c-2 8-1 15 2 21-4-2-6-6-6-11 0-4 1-7 4-10Z" fill={hair} />
            <path d="M72 37c2 8 1 15-2 21 4-2 6-6 6-11 0-4-1-7-4-10Z" fill={hair} />
          </>
        ) : null}

        <path d="M35 40c2-2 5-2 7 0" fill="none" stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M58 40c2-2 5-2 7 0" fill="none" stroke={hair} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="39" cy="48" r="2.4" fill="#29231f" />
        <circle cx="61" cy="48" r="2.4" fill="#29231f" />
        <circle cx="39.8" cy="47.2" r="0.7" fill="#ffffff" />
        <circle cx="61.8" cy="47.2" r="0.7" fill="#ffffff" />

        {glasses ? (
          <g fill="none" stroke="#3f4a45" strokeWidth="1.3">
            <rect x="29" y="42.5" width="18" height="11" rx="5" />
            <rect x="53" y="42.5" width="18" height="11" rx="5" />
            <path d="M47 47.5h6" />
          </g>
        ) : null}

        <path d="M50 50c-1 3-2 4 0 5" fill="none" stroke="#b77a64" strokeWidth="1.2" strokeLinecap="round" />
        <path
          d={smile ? "M42 60c4 5 12 5 16 0" : "M43 62h14"}
          fill="none"
          stroke="#7d3f3a"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <ellipse cx="33" cy="57" rx="4" ry="2" fill="#e88b7d" opacity="0.24" />
        <ellipse cx="67" cy="57" rx="4" ry="2" fill="#e88b7d" opacity="0.24" />
        {earring ? <circle cx="75" cy="58" r="2.2" fill="#d5a447" /> : null}
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#17201d" strokeOpacity="0.1" strokeWidth="1" />
    </svg>
  );
}

