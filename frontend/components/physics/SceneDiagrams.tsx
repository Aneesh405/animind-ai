"use client";

import { useMemo } from "react";
import { calculate } from "../../lib/physics";
import type { Parameters } from "../../lib/types";

export const COLORS: Record<number, string> = { 30: "#287d70", 45: "#365fc6", 60: "#9a6e24" };
export const SELECTED_COLOR = "#365fc6";
const CORAL = "#e17b64";
const INK = "#354b41";
const MUTED = "#63766b";
const GRID = "#dfe6dd";
const regularTicks = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const compactTicks = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const tick = (value: number) => (value >= 10000 ? compactTicks : regularTicks).format(value);

type DiagramProps = { parameters: Parameters; progress: number; compact: boolean };

export function Trajectories({ parameters, progress, stage, markerId, compact, compare }: DiagramProps & { stage: number; markerId: string; compare: boolean }) {
  const geometry = useMemo(() => {
    const angles = compare ? Array.from(new Set([30, 45, 60, parameters.angle])) : [parameters.angle];
    const left = compact ? 45 : 65;
    const ground = compact ? 283 : 298;
    const width = compact ? 343 : 660;
    const height = compact ? 215 : 236;
    const rangeBound = Math.max(50, (parameters.speed ** 2 / Math.min(parameters.gravity, 9.81)) * 1.15);
    const heightBound = Math.max(25, parameters.speed ** 2 / (2 * Math.min(parameters.gravity, 9.81)));
    const xScale = width / rangeBound;
    const yScale = height / heightBound;
    const sample = (angle: number, elapsed: number) => {
      const metrics = calculate(parameters, angle);
      const time = Math.min(elapsed, metrics.flight_time);
      return { x: left + metrics.horizontal_velocity * time * xScale, y: ground - Math.max(0, metrics.vertical_velocity * time - parameters.gravity * time ** 2 / 2) * yScale };
    };
    const paths = angles.map((angle) => {
      const metrics = calculate(parameters, angle);
      const points = Array.from({ length: 100 }, (_, i) => sample(angle, i / 99 * metrics.flight_time));
      return { angle, metrics, points, polyline: points.map((point) => `${point.x},${point.y}`).join(" ") };
    });
    return { left, ground, width, height, rangeBound, heightBound, xScale, yScale, sample, paths, duration: Math.max(...paths.map((path) => path.metrics.flight_time), .01) };
  }, [parameters.angle, parameters.speed, parameters.gravity, compact, compare]);
  const { left, ground, width, height, rangeBound, heightBound, paths } = geometry;
  const time = progress * geometry.duration;
  const chartWidth = compact ? 420 : 780;
  const selected = paths.find((path) => path.angle === parameters.angle)!;
  const current = geometry.sample(parameters.angle, time);
  const verticalSpeed = selected.metrics.vertical_velocity - parameters.gravity * Math.min(time, selected.metrics.flight_time);
  const arrowTime = Math.min(.45, 64 / Math.max(selected.metrics.horizontal_velocity * geometry.xScale, Math.abs(verticalSpeed) * geometry.yScale, 1));
  const vx = selected.metrics.horizontal_velocity * geometry.xScale * arrowTime;
  const vy = -verticalSpeed * geometry.yScale * arrowTime;
  return <svg viewBox={`0 0 ${chartWidth} 365`} role="img" aria-label={compare ? "Projectile paths at 30, 45, and 60 degrees with simultaneous physical time and a live selected launch angle." : `Projectile path at ${parameters.angle} degrees. The coral marker follows the calculated trajectory; teal arrows show instantaneous velocity components.`}>
    <defs><marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0L6 3L0 6" fill="none" stroke="#287d70" strokeWidth="1.2" /></marker></defs>
    {[0, 1, 2, 3, 4].map((index) => <g key={index}>
      <line x1={left} x2={left + width} y1={ground - index * height / 4} y2={ground - index * height / 4} stroke={GRID} strokeDasharray="2 5" />
      <line x1={left + index * width / 4} x2={left + index * width / 4} y1={ground} y2={ground - height} stroke={GRID} strokeDasharray="2 5" />
      <text x={left - 12} y={ground - index * height / 4 + 4} textAnchor="end" fill={MUTED} fontSize={compact ? 12 : 11}>{tick(index * heightBound / 4)}</text>
      <text x={left + index * width / 4} y={ground + 23} textAnchor="middle" fill={MUTED} fontSize={compact ? 12 : 11}>{tick(index * rangeBound / 4)}</text>
    </g>)}
    <line x1={left} y1={ground - height - 7} x2={left} y2={ground} stroke="#a8b6a9" strokeWidth="1.2" />
    <line x1={left} y1={ground} x2={left + width + 8} y2={ground} stroke="#a8b6a9" strokeWidth="1.2" />
    <text x={compact ? 13 : 25} y="35" fill={MUTED} fontSize={compact ? 12 : 11}>Height (m)</text>
    <text x={left + width} y={compact ? 344 : 347} textAnchor="end" fill={MUTED} fontSize={compact ? 12 : 11}>{compact ? "Distance (m)" : "Horizontal distance (m)"}</text>
    {paths.map(({ angle, metrics, points, polyline }) => {
      const position = geometry.sample(angle, time);
      const isSelected = parameters.angle === angle;
      const color = COLORS[angle] || SELECTED_COLOR;
      return <g key={angle}>
        <polyline points={polyline} fill="none" stroke={color} strokeOpacity={isSelected ? 1 : .65} strokeWidth={isSelected ? 2.8 : 1.6} strokeDasharray={isSelected ? undefined : "4 5"} strokeLinecap="round" strokeLinejoin="round" />
        {isSelected && stage === 2 && <line x1={left} x2={left + metrics.range * geometry.xScale} y1={ground + 34} y2={ground + 34} stroke={color} strokeWidth="2" />}
        <circle cx={position.x} cy={position.y} r={isSelected ? 11 : 7} fill={isSelected ? CORAL : color} opacity=".1" />
        <circle cx={position.x} cy={position.y} r={isSelected ? 5.5 : 4} fill={isSelected ? CORAL : color} stroke="#f7f9f6" strokeWidth="1.5" />
        <text x={points[45].x} y={points[45].y - 15} textAnchor="middle" fill={color} fontSize={compact ? 14 : 13} fontWeight="550">{angle}°</text>
      </g>;
    })}
    {time < selected.metrics.flight_time && <g opacity={stage === 1 ? 1 : .7} role="group" aria-label="Instantaneous velocity components">
      {vx > 3 && <line x1={current.x} y1={current.y} x2={current.x + vx} y2={current.y} stroke="#287d70" strokeWidth="1.7" markerEnd={`url(#${markerId})`} />}
      {Math.abs(vy) > 3 && <line x1={current.x} y1={current.y} x2={current.x} y2={current.y + vy} stroke="#287d70" strokeWidth="1.7" markerEnd={`url(#${markerId})`} />}
    </g>}
    <circle cx={left} cy={ground} r="3" fill={INK} />
    <text x={left + 10} y={ground - 12} fill={MUTED} fontSize={compact ? 11 : 10}>Launch</text>
    <text x={chartWidth - 28} y="29" textAnchor="end" fill={MUTED} fontSize={compact ? 12 : 11}>t = {time.toFixed(2)} s</text>
    {!compact && <text x="82" y="49" fill={INK} fontSize="12">{["One launch speed. Three directions.", "Notice sideways speed and airtime together.", "The landing distance tells the story."][Math.min(stage, 2)]}</text>}
  </svg>;
}

export function Components({ parameters, markerId, progress, compact }: DiagramProps & { markerId: string }) {
  const metrics = calculate(parameters);
  const scale = (compact ? 155 : 190) / parameters.speed;
  const origin = { x: compact ? 70 : 112, y: compact ? 216 : 279 };
  const tip = { x: origin.x + metrics.horizontal_velocity * scale, y: origin.y - metrics.vertical_velocity * scale };
  const theta = parameters.angle * Math.PI / 180;
  const arcX = origin.x + 36 * Math.cos(theta);
  const arcY = origin.y - 36 * Math.sin(theta);
  return <svg viewBox={compact ? "0 0 420 365" : "0 0 780 365"} role="img" aria-label={`Initial velocity decomposition at ${parameters.angle} degrees. Horizontal velocity ${metrics.horizontal_velocity.toFixed(2)} metres per second and initial vertical velocity ${metrics.vertical_velocity.toFixed(2)} metres per second.`}>
    <defs><marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0L6 3L0 6Z" fill="context-stroke" /></marker></defs>
    <text x={compact ? 28 : 42} y="35" fill={MUTED} fontSize="12">Initial velocity · measured at launch</text>
    <line x1={origin.x - 30} y1={origin.y} x2={origin.x + 240} y2={origin.y} stroke="#bdc9bc" />
    <line x1={origin.x} y1={origin.y - 195} x2={origin.x} y2={origin.y + 30} stroke="#bdc9bc" />
    <path d={`M${origin.x + 36},${origin.y}A36 36 0 0 0 ${arcX} ${arcY}`} fill="none" stroke="#a6b49f" />
    <text x={origin.x + 44} y={origin.y - 12} fill={MUTED} fontSize="13">{parameters.angle}°</text>
    <line x1={tip.x} y1={tip.y} x2={tip.x} y2={origin.y} stroke="#55b7a5" strokeDasharray="4 5" />
    <line x1={origin.x} y1={tip.y} x2={tip.x} y2={tip.y} stroke="#4776e6" strokeDasharray="4 5" />
    <line x1={origin.x} y1={origin.y} x2={tip.x} y2={origin.y} stroke="#287d70" strokeWidth="2.6" markerEnd={`url(#${markerId})`} />
    <line x1={origin.x} y1={origin.y} x2={origin.x} y2={tip.y} stroke="#365fc6" strokeWidth="2.6" markerEnd={`url(#${markerId})`} />
    <line x1={origin.x} y1={origin.y} x2={tip.x} y2={tip.y} stroke={CORAL} strokeWidth="3" markerEnd={`url(#${markerId})`} />
    <circle cx={origin.x + (tip.x - origin.x) * progress} cy={origin.y + (tip.y - origin.y) * progress} r="4.5" fill={CORAL} stroke="#f7f9f6" strokeWidth="1.5" />
    <text x={origin.x + (tip.x - origin.x) / 2} y={origin.y + 27} textAnchor="middle" fill="#287d70" fontSize="14">vₓ</text>
    <text x={origin.x - 19} y={tip.y - 12} fill="#365fc6" fontSize="14">vᵧ₀</text>
    <text x={tip.x + 13} y={tip.y - 8} fill="#a8513e" fontSize="14">v₀</text>
    {!compact && <line x1="389" x2="389" y1="60" y2="304" stroke={GRID} />}
    <g transform={compact ? "translate(30 272)" : "translate(425 83)"}>
      <text fill="#287d70" fontSize={compact ? 10 : 11}>HORIZONTAL · SIDEWAYS</text>
      <text y={compact ? 31 : 43} fill={INK} fontSize={compact ? 26 : 32} fontWeight="500">{metrics.horizontal_velocity.toFixed(2)}<tspan fontSize="12" fill={MUTED}> m/s</tspan></text>
      <text y={compact ? 53 : 72} fill={MUTED} fontSize={compact ? 12 : 13}>vₓ = v₀ cos(θ)</text>
    </g>
    <g transform={compact ? "translate(238 272)" : "translate(425 215)"}>
      <text fill="#365fc6" fontSize={compact ? 10 : 11}>VERTICAL · UPWARD</text>
      <text y={compact ? 31 : 43} fill={INK} fontSize={compact ? 26 : 32} fontWeight="500">{metrics.vertical_velocity.toFixed(2)}<tspan fontSize="12" fill={MUTED}> m/s</tspan></text>
      <text y={compact ? 53 : 72} fill={MUTED} fontSize={compact ? 12 : 13}>vᵧ₀ = v₀ sin(θ)</text>
    </g>
    {!compact && <text x="390" y="343" textAnchor="middle" fill={MUTED} fontSize="12">Change the angle. The launch-speed arrow keeps the same length.</text>}
  </svg>;
}

export function RangeComparison({ parameters, progress, compact }: DiagramProps) {
  const angles = Array.from(new Set([30, 45, 60, parameters.angle]));
  const maximum = parameters.speed ** 2 / parameters.gravity;
  const left = compact ? 85 : 138;
  const width = compact ? 302 : 590;
  return <svg viewBox={compact ? "0 0 420 365" : "0 0 780 365"} role="img" aria-label="Range comparison. Horizontal speed times flight time determines range. 30 and 60 degrees have equal range and 45 degrees has maximum range.">
    <text x={compact ? 22 : 39} y="35" fill={MUTED} fontSize={compact ? 11 : 12}>ANGLE</text>
    <text x={left} y="35" fill={MUTED} fontSize={compact ? 11 : 12}>{compact ? "SIDEWAYS SPEED × AIRTIME" : "HORIZONTAL SPEED × FLIGHT TIME = RANGE"}</text>
    {angles.map((angle, index) => {
      const metrics = calculate(parameters, angle);
      const color = COLORS[angle] || SELECTED_COLOR;
      const y = 80 + index * 64;
      return <g key={angle} opacity={Math.floor(progress * angles.length) === index || parameters.angle === angle ? 1 : .85}>
        <text x={compact ? 23 : 43} y={y + 6} fill={color} fontSize={compact ? 21 : 23} fontWeight="500">{angle}°</text>
        <text x={left} y={y - 3} fill={INK} fontSize={compact ? 12 : 14}>{metrics.horizontal_velocity.toFixed(2)} × {metrics.flight_time.toFixed(2)}{!compact && "  (m/s × s)"}</text>
        <text x={left + width} y={y - 3} textAnchor="end" fill={color} fontSize={compact ? 13 : 14} fontWeight="600">{metrics.range.toFixed(2)} m</text>
        <rect x={left} y={y + 16} width={width} height="7" rx="3.5" fill="#e2e9df" />
        <rect x={left} y={y + 16} width={Math.max(0, metrics.range / maximum * width)} height="7" rx="3.5" fill={color} />
      </g>;
    })}
    <text x={compact ? 210 : 390} y="344" fill={MUTED} fontSize={compact ? 12 : 12} textAnchor="middle">30° & 60°: equal range. 45°: maximum.</text>
  </svg>;
}
