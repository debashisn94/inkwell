// The example composition: a mocap-driven character walking across frame, with
// word-timed captions underneath.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Character, Pose, RIG } from './Character';
import { Captions } from './Captions';
import cycle from './data/walk-cycle.json';
import captions from './data/captions.json';
import timing from './data/timing.json';

const PAPER = '#FAF6EE';

// Wrap a difference into (-180, 180] so interpolating across the seam takes the short way.
// The baker already wraps the stored values, but the same wrap is needed at lerp time.
const shortestArc = (d: number) => {
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
};

const sampleCycle = (t: number) => {
  const n = cycle.samples;
  const f = ((t / cycle.strideSeconds) % 1) * n;
  const a = Math.floor(f) % n;
  const b = (a + 1) % n;
  const k = f - Math.floor(f);
  const A = cycle.cycle[a] as Record<string, number>;
  const B = cycle.cycle[b] as Record<string, number>;
  const pose = {} as Record<string, number>;
  for (const j of Object.keys(A)) pose[j] = A[j] + shortestArc(B[j] - A[j]) * k;
  return pose as unknown as Pose;
};

// GROUND CONSTRAINT. The baker emits joint angles, not a root position -- nothing in the
// data pins the feet to the floor, so a character placed at a fixed height drifts and
// skates. Run the same 2D forward kinematics the rig uses, find the lowest foot for this
// pose, and offset the whole character so that foot rests on the ground line.
const rad = (d: number) => (d * Math.PI) / 180;
const footY = (hip: number, kn: number) => {
  const knee = RIG.hipY + RIG.thigh * Math.sin(rad(hip));
  const ankle = knee + RIG.shin * Math.sin(rad(hip + kn));
  return ankle + RIG.foot;
};
const groundOffset = (pose: Pose) =>
  RIG.ground - Math.max(footY(pose.hipR, pose.knR), footY(pose.hipL, pose.knL));

export const Walk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const pose = sampleCycle(frame / fps);

  const groundY = height * 0.78;
  const x = interpolate(frame, [0, durationInFrames], [width * 0.2, width * 0.8]);
  const dy = groundOffset(pose);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line x1={0} y1={groundY} x2={width} y2={groundY}
              stroke="#2E1D14" strokeWidth={5} opacity={0.16} />
        {/* contact shadow stays on the ground line, not on the character */}
        <ellipse cx={x} cy={groundY + 6} rx={140} ry={20} fill="#2E1D14" opacity={0.1} />
        <g transform={`translate(${x - 400} ${groundY - RIG.ground + dy})`}>
          <Character pose={pose} />
        </g>
      </svg>
      <Captions beats={captions} timing={timing} />
    </AbsoluteFill>
  );
};
