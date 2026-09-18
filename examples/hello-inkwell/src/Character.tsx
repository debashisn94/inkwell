// A flat-cartoon character built to references/svg-characters.md, rigged so every joint
// angle from the mocap baker drives a nested SVG group.
//
// Drawn IN PROFILE, facing right. This is deliberate: the baker flattens motion onto the
// sagittal plane, so the swing it describes is forward-and-back. Drive a front-facing
// character with it and that swing reads as legs and arms splaying sideways instead --
// the third gotcha in references/mocap-rigs.md, and very obvious once you see it.
//
// Angle convention: the baker measures screen-space angles where +y is down, so a limb
// hanging straight down is 90 degrees. Limb paths here are drawn pointing down at
// rotation 0, hence the `- 90` at the root of each chain. Child angles (knee, ankle,
// elbow) are stored RELATIVE to their parent bone, so they are applied as-is.
import React from 'react';

const OUTLINE = '#2E1D14';   // rule 7: one outline colour, never #000
const SKIN = '#EB944E';
const SKIN_SH = '#C57F52';
const TOP = '#2149C1';
const TOP_SH = '#1D3995';
const TOP_FAR = '#162C6E';
const TROUSER = '#3A434E';
const TROUSER_SH = '#2B323B';
const HAIR = '#33261C';
const SHOE = '#2E1D14';

const LW = 13;   // silhouette line weight
const LI = 8;    // interior

// Skeleton metrics. Walk.tsx re-uses these to work out where the feet are.
export const RIG = { hipY: 520, thigh: 215, shin: 190, foot: 20, shoulderY: 300, ground: 945 };

// rule 5: closed tapered paths, never round-capped strokes
const limb = (w0: number, w1: number, L: number, bow = 8) =>
  `M ${-w0} 0 Q 0 ${-w0 * 0.55} ${w0} 0 Q ${w1 + bow} ${L * 0.55} ${w1} ${L} ` +
  `Q 0 ${L + w1 * 0.5} ${-w1} ${L} Q ${-w0 + bow} ${L * 0.5} ${-w0} 0 Z`;

export type Pose = {
  hipR: number; knR: number; ankR: number;
  hipL: number; knL: number; ankL: number;
  shR: number; elR: number; shL: number; elL: number;
  lean: number; headTilt: number;
};

const Leg: React.FC<{ hip: number; kn: number; ank: number; fill: string; shoe: string }> =
  ({ hip, kn, ank, fill, shoe }) => (
    <g transform={`translate(400 ${RIG.hipY}) rotate(${hip - 90})`}>
      <circle r={46} fill={fill} />{/* rule 22: joint cap first, or rotations show seams */}
      <path d={limb(46, 37, RIG.thigh)} fill={fill} />
      <g transform={`translate(0 ${RIG.thigh}) rotate(${kn})`}>
        <circle r={37} fill={fill} />
        <path d={limb(37, 28, RIG.shin)} fill={fill} />
        <g transform={`translate(0 ${RIG.shin}) rotate(${ank})`}>
          {/* foot points forward from the ankle; +x is the way the character faces */}
          <path d="M -26 -6 Q 30 -14 62 6 Q 66 26 40 30 L -24 30 Q -34 12 -26 -6 Z" fill={shoe} />
        </g>
      </g>
    </g>
  );

// Shoulder sits slightly forward of centre, as it reads in profile. The sleeve is kept
// short so the skin forearm clears the torso silhouette -- a full-length sleeve in the
// same blue as the body makes the upper arm vanish and the forearm read as a stub.
const Arm: React.FC<{ sh: number; el: number; sleeve: string; skin: string }> =
  ({ sh, el, sleeve, skin }) => (
    <g transform={`translate(412 ${RIG.shoulderY}) rotate(${sh - 90})`}>
      <circle r={36} fill={sleeve} />
      <path d={limb(36, 27, 118)} fill={sleeve} />
      <g transform={`translate(0 118) rotate(${el})`}>
        <circle r={26} fill={skin} />
        <path d={limb(26, 20, 124)} fill={skin} />
        <ellipse cx={3} cy={134} rx={21} ry={24} fill={skin} />
      </g>
    </g>
  );

export const Character: React.FC<{ pose: Pose }> = ({ pose }) => (
  // rule 8: paint-order="stroke" is the single most important attribute -- without it
  // default straddled strokes eat ~6px off every edge and swallow thin features.
  <g stroke={OUTLINE} strokeWidth={LW} strokeLinejoin="round" strokeLinecap="round" paintOrder="stroke">

    {/* ---- FAR side first (darker, rule: depth by value not by outline) ---- */}
    <Leg hip={pose.hipL} kn={pose.knL} ank={pose.ankL} fill={TROUSER_SH} shoe="#241811" />
    <Arm sh={pose.shL} el={pose.elL} sleeve={TOP_FAR} skin={SKIN_SH} />

    {/* ---- torso + head, leaning as one unit ---- */}
    <g transform={`translate(400 ${RIG.hipY}) rotate(${pose.lean}) translate(-400 -${RIG.hipY})`}>
      {/* profile torso: chest forward of the hip, back slightly rounded */}
      <path d="M 348 288 Q 424 272 464 300 Q 480 410 470 508 Q 400 526 334 508 Q 326 394 348 288 Z" fill={TOP} />
      <path d="M 334 508 Q 400 526 470 508 L 468 540 Q 400 558 334 540 Z" fill={TOP_SH} stroke="none" />
      <path d="M 348 288 Q 424 272 464 300 L 460 344 Q 420 320 350 332 Z" fill={TOP_SH} stroke="none" opacity={0.85} />

      <g transform={`translate(400 268) rotate(${pose.headTilt}) translate(-400 -268)`}>
        <rect x={378} y={232} width={46} height={52} rx={20} fill={SKIN} />
        {/* head in profile: brow and nose on the +x side */}
        <path d="M 296 152 Q 300 44 392 40 Q 486 44 496 140 Q 506 156 492 168 Q 500 188 484 196
                 Q 486 244 430 262 Q 372 272 330 244 Q 296 214 296 152 Z" fill={SKIN} />
        {/* rule 13(3): under-chin shadow is non-negotiable or the head floats */}
        <ellipse cx={392} cy={258} rx={78} ry={26} fill={SKIN_SH} stroke="none" opacity={0.7} />
        {/* hair mass covering crown and back */}
        <path d="M 292 156 Q 282 40 392 34 Q 496 38 500 132 Q 470 74 396 78 Q 330 82 314 152
                 Q 308 172 292 156 Z" fill={HAIR} />
        <path d="M 330 72 Q 366 44 410 50" fill="none" stroke={HAIR} strokeWidth={LI} opacity={0.5} />
        {/* one eye (profile), pupil toward the direction of travel */}
        <ellipse cx={440} cy={150} rx={19} ry={22} fill="#FFFFFF" />
        <circle cx={446} cy={152} r={14} fill="#3B2A1F" stroke="none" />
        <circle cx={447} cy={153} r={8} fill="#1A1008" stroke="none" />
        <circle cx={437} cy={143} r={5} fill="#FFFFFF" stroke="none" />
        <path d="M 418 126 Q 442 112 464 126" fill="none" stroke={OUTLINE} strokeWidth={LI * 1.5} />
        <ellipse cx={356} cy={196} rx={28} ry={13} fill="#E2733F" opacity={0.38} stroke="none" />
        <path d="M 452 206 Q 436 220 414 216" fill="none" stroke={OUTLINE} strokeWidth={LI} />
      </g>
    </g>

    {/* ---- NEAR side last, in front of the torso ---- */}
    <Leg hip={pose.hipR} kn={pose.knR} ank={pose.ankR} fill={TROUSER} shoe={SHOE} />
    <Arm sh={pose.shR} el={pose.elR} sleeve={TOP} skin={SKIN} />
  </g>
);
