/* Sorteos AR — animated logo. Concept: two independent sources converge;
   the agreed result is the lit intersection (a "6" for Quini 6). */

const INK = '#0A0F1C';
const TILE = '#17263E';
const IVORY = '#EDE6D6';
const CELESTE = '#74C0E8';

const MOTION = {
  enter: Easing.easeOutQuart,
  glide: Easing.easeInOutCubic,
  pop: Easing.easeOutBack,
};

function spinNum(T, seed) {
  const k = Math.floor(T * 11) + seed;
  const n = (Math.abs(k * 37 + seed * 131) % 45) + 1;
  return String(n).padStart(2, '0');
}

function SorteosPiece(props) {
  const { T, CUES, authoredTotal } = useComposition();
  const accent = props.accent || CELESTE;
  const word = props.word || 'Sorteos AR';
  const tag = props.tagline == null ? 'Sorteos Argentinos' : props.tagline;

  const R = 150;
  const mergeStart = CUES.Coinciden + 0.15;
  const settle = CUES.Coinciden + 0.95;

  const cx =
    T < mergeStart
      ? animate({ from: 940, to: 285, start: 0.2, end: mergeStart, ease: MOTION.enter })(T)
      : animate({ from: 285, to: 55, start: mergeStart, end: settle, ease: MOTION.glide })(T);

  const ballsIn = animate({ from: 0, to: 1, start: 0.25, end: 1.05, ease: MOTION.enter })(T);
  const lens = animate({ from: 0, to: 1, start: settle - 0.06, end: settle + 0.34, ease: MOTION.pop })(T);
  const numIn = animate({ from: 0, to: 1, start: settle + 0.1, end: settle + 0.5, ease: MOTION.pop })(T);
  const aFade = animate({ from: 1, to: 0, start: settle - 0.25, end: settle + 0.05, ease: MOTION.glide })(T);

  // ripple on coincidence
  const rip = animate({ from: 0, to: 1, start: settle, end: settle + 0.95, ease: Easing.easeOutQuart })(T);
  const ripR = 120 + rip * 420;
  const ripO = (1 - rip) * 0.5 * (rip > 0 ? 1 : 0);

  // squircle tile draws in
  const tileDraw = animate({ from: 0, to: 1, start: CUES.Marca, end: CUES.Marca + 0.85, ease: MOTION.glide })(T);
  const tileFill = animate({ from: 0, to: 1, start: CUES.Marca + 0.5, end: CUES.Marca + 1.15, ease: MOTION.glide })(T);

  // camera
  const camScale =
    animate({ from: 1.34, to: 1.0, start: CUES.Marca - 0.3, end: CUES.Marca + 0.8, ease: MOTION.glide })(T);
  const camX = animate({ from: 0, to: -300, start: CUES.Firma - 0.35, end: CUES.Firma + 0.75, ease: MOTION.glide })(T);

  const wordIn = animate({ from: 0, to: 1, start: CUES.Firma + 0.15, end: CUES.Firma + 1.05, ease: MOTION.enter })(T);
  const tagIn = animate({ from: 0, to: 1, start: CUES.Firma + 0.6, end: CUES.Firma + 1.5, ease: MOTION.enter })(T);

  const outro = animate({ from: 1, to: 0, start: authoredTotal - 0.55, end: authoredTotal - 0.02, ease: MOTION.glide })(T);

  const settled = T >= settle;
  const numA = settled ? '17' : spinNum(T, 3);
  const numB = settled ? '17' : spinNum(T, 17);

  const popScale = settled
    ? 1 + 0.055 * Math.max(0, 1 - (T - settle) / 0.45) * Math.sin(Math.min(1, (T - settle) / 0.45) * Math.PI)
    : 1;

  const bobFade = animate({ from: 1, to: 0, start: mergeStart, end: settle, ease: MOTION.glide })(T);
  const bob = Math.sin(T * 1.15) * 9 * ballsIn * bobFade;
  const ballStyle = { fontFamily: 'Archivo, system-ui, sans-serif', fontWeight: 800 };

  return (
    <svg
      viewBox="-800 -450 1600 900"
      width="1600"
      height="900"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect x="-800" y="-450" width="1600" height="900" fill={INK} />
      <g opacity={outro}>
      <g transform={`translate(${camX} 0) scale(${camScale})`}>
        {/* squircle tile */}
        <g opacity={tileDraw > 0 ? 1 : 0}>
          <rect
            x="-330" y="-330" width="660" height="660" rx="152"
            fill={TILE} fillOpacity={tileFill * 1}
            stroke={accent} strokeOpacity="0.5" strokeWidth="5"
            pathLength="1" strokeDasharray="1" strokeDashoffset={1 - tileDraw}
          />
        </g>

        <g transform={`translate(0 ${bob}) scale(${popScale})`}>
          {/* ripple */}
          <circle cx="0" cy="0" r={ripR} fill="none" stroke={accent} strokeOpacity={ripO} strokeWidth="6" />

          <defs>
            <clipPath id="lensClip">
              <circle cx={-cx} cy="0" r={R} />
            </clipPath>
          </defs>

          {/* the agreed intersection */}
          <g clipPath="url(#lensClip)" opacity={lens}>
            <circle cx={cx} cy="0" r={R} fill={accent} />
          </g>

          {/* two sources */}
          <circle cx={-cx} cy="0" r={R} fill="none" stroke={IVORY} strokeOpacity={0.9 * ballsIn} strokeWidth="9" />
          <circle cx={cx} cy="0" r={R} fill="none" stroke={IVORY} strokeOpacity={0.9 * ballsIn} strokeWidth="9" />

          <text
            x={-cx} y="4" textAnchor="middle" dominantBaseline="central"
            fill={IVORY} opacity={ballsIn * aFade} fontSize="112" style={ballStyle}
          >
            {numA}
          </text>
          <text
            x={settled ? 0 : cx} y={settled ? 6 : 4} textAnchor="middle" dominantBaseline="central"
            fill={settled ? INK : IVORY} opacity={ballsIn} fontSize={settled ? 108 + 24 * numIn : 112}
            letterSpacing={settled ? -7 : 0}
            style={ballStyle}
          >
            {numB}
          </text>
        </g>

        {/* signature */}
        <g opacity={wordIn}>
          <text
            x={410} y={(tag ? -34 : 4) + (1 - wordIn) * 26} textAnchor="start" dominantBaseline="central"
            fill={IVORY} fontSize="104" letterSpacing="-1"
            style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontWeight: 800 }}
          >
            {word}
          </text>
          <text
            x={412} y={58 + (1 - tagIn) * 20} textAnchor="start" dominantBaseline="central"
            fill={accent} opacity={tagIn} fontSize="42" letterSpacing="0.5"
            style={{ fontFamily: 'Archivo, system-ui, sans-serif', fontWeight: 500 }}
          >
            {tag}
          </text>
        </g>
      </g>
      </g>
    </svg>
  );
}

function SorteosLogoVideo(props) {
  return (
    <CompositionStage
      width={1600}
      height={900}
      bg={INK}
      scenes={window.OM_SCENES}
      playback={window.OM_PLAYBACK}
    >
      <SorteosPiece accent={props.accent} word={props.word} tagline={props.tagline} />
    </CompositionStage>
  );
}

window.SorteosLogoVideo = SorteosLogoVideo;
