"use client";

import { useMemo } from "react";
import { calculate, sampleFlight } from "../../lib/physics";
import type { Parameters } from "../../lib/types";

export const COLORS: Record<number, string> = { 30: "#287d70", 45: "#365fc6", 60: "#875f1f" };
export const SELECTED_COLOR = "#365fc6";
const CORAL = "#e17b64";
const INK = "#354b41";
const MUTED = "#63766b";
const GRID = "#dfe6dd";
const regularTicks = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const compactTicks = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const tick = (value: number) => (value >= 10000 ? compactTicks : regularTicks).format(value);

type DiagramProps = { parameters: Parameters; progress: number; compact: boolean };

export function Trajectories({ parameters, progress, stage, markerId, compact, compare, comparisonAngles }: DiagramProps & { stage: number; markerId: string; compare: boolean; comparisonAngles?: number[] }) {
  const comparisonKey = comparisonAngles?.join(",") || "30,45,60";
  const geometry = useMemo(() => {
    const configuredAngles = comparisonKey.split(",").map(Number);
    const angles = compare ? Array.from(new Set([...configuredAngles, parameters.angle])) : [parameters.angle];
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
  }, [parameters.angle, parameters.speed, parameters.gravity, compact, compare, comparisonKey]);
  const { left, ground, width, height, rangeBound, heightBound, paths } = geometry;
  const time = progress * geometry.duration;
  const chartWidth = compact ? 420 : 780;
  const selected = paths.find((path) => path.angle === parameters.angle)!;
  const current = geometry.sample(parameters.angle, time);
  const verticalSpeed = selected.metrics.vertical_velocity - parameters.gravity * Math.min(time, selected.metrics.flight_time);
  // One fixed scale throughout flight: horizontal arrow length must not change.
  const arrowTime = Math.min(.45, 64 / Math.max(parameters.speed * geometry.xScale, parameters.speed * geometry.yScale, 1));
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
        {isSelected && stage >= 4 && <line x1={left} x2={left + metrics.range * geometry.xScale} y1={ground + 34} y2={ground + 34} stroke={color} strokeWidth="2" />}
        <circle cx={position.x} cy={position.y} r={isSelected ? 11 : 7} fill={isSelected ? CORAL : color} opacity=".1" />
        <circle cx={position.x} cy={position.y} r={isSelected ? 5.5 : 4} fill={isSelected ? CORAL : color} stroke="#f7f9f6" strokeWidth="1.5" />
        <text x={points[45].x} y={points[45].y - 15} textAnchor="middle" fill={color} fontSize={compact ? 14 : 13} fontWeight="550">{angle}°</text>
      </g>;
    })}
    {time < selected.metrics.flight_time && <g opacity={stage === 1 ? 1 : .7} role="group" aria-label="Instantaneous velocity components">
      <line data-testid="vx-vector" x1={current.x} y1={current.y} x2={current.x + vx} y2={current.y} stroke="#287d70" strokeWidth="1.7" markerEnd={vx > 3 ? `url(#${markerId})` : undefined} />
      <line data-testid="vy-vector" x1={current.x} y1={current.y} x2={current.x} y2={current.y + vy} stroke="#287d70" strokeWidth="1.7" markerEnd={Math.abs(vy) > 3 ? `url(#${markerId})` : undefined} />
    </g>}
    <circle cx={left} cy={ground} r="3" fill={INK} />
    <text x={left + 10} y={ground - 12} fill={MUTED} fontSize={compact ? 11 : 10}>Launch</text>
    <text x={chartWidth - 28} y="29" textAnchor="end" fill={MUTED} fontSize={compact ? 12 : 11}>t = {time.toFixed(2)} s</text>
    {!compact && <text x="82" y="49" fill={INK} fontSize="12">{stage < 3 ? "One launch speed. Compare its two components." : stage === 3 ? "Same elapsed time. Different sideways speeds and airtimes." : "Compare the landing distances."}</text>}
  </svg>;
}

export function Components({ parameters, markerId, progress, compact }: DiagramProps & { markerId: string }) {
  const geometry = useMemo(() => {
    const metrics = calculate(parameters);
    const left = 55, ground = compact ? 221 : 269;
    const sx = 295 / (parameters.speed ** 2 / parameters.gravity * 1.15);
    const sy = sx; // Equal spatial scales preserve the launch angle and vector direction.
    const points = Array.from({ length: 100 }, (_, i) => sampleFlight(parameters, metrics.flight_time * i / 99));
    const path = points.map((p) => `${left + p.x * sx},${ground - p.y * sy}`).join(" ");
    return { metrics, left, ground, sx, sy, path, arrowTime: 52 / (parameters.speed * Math.max(sx, sy)) };
  }, [parameters.angle, parameters.speed, parameters.gravity, compact]);
  const { metrics, left, ground, sx, sy, path, arrowTime } = geometry;
  const ball = sampleFlight(parameters, progress * metrics.flight_time);
  const x = left + ball.x * sx, y = ground - ball.y * sy;
  const dx = ball.vx * sx * arrowTime, dy = -ball.vy * sy * arrowTime;
  const gx = compact ? 370 : 380;
  return <svg viewBox={compact ? "0 0 420 365" : "0 0 780 365"} role="img" data-time={ball.time} data-vx={ball.vx} data-vy={ball.vy} aria-label={`Velocity components during projectile flight at ${parameters.angle} degrees. Horizontal velocity is constant; vertical velocity decreases under downward gravity.`}>
    <defs><marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0L6 3L0 6Z" fill="context-stroke" /></marker></defs>
    <text x="28" y="32" fill={MUTED} fontSize="12">{ball.landed ? "At landing · flight complete" : progress === 0 ? "Resolve the launch velocity" : ball.vy > .01 ? "Ascending · vᵧ decreases" : ball.vy < -.01 ? "Descending · vᵧ is negative" : "At the apex · vᵧ = 0"}</text>
    {[0, 1, 2, 3].map(i => <line key={i} x1={left} x2="350" y1={ground - i * (compact ? 45 : 60)} y2={ground - i * (compact ? 45 : 60)} stroke={GRID} strokeDasharray="2 5" />)}
    <line x1={left} x2="352" y1={ground} y2={ground} stroke="#a8b6a9" />
    <polyline points={path} fill="none" stroke="#b3c3b7" strokeWidth="2" strokeDasharray="4 5" />
    {!ball.landed && <g aria-label="Instantaneous velocity components">
      {progress === 0 && <><line x1={x + dx} x2={x + dx} y1={y} y2={y + dy} stroke="#8ca89e" strokeDasharray="3 4" /><line data-testid="launch-vector" x1={x} y1={y} x2={x + dx} y2={y + dy} stroke={CORAL} strokeWidth="2" markerEnd={`url(#${markerId})`} /></>}
      <line data-testid="vx-vector" x1={x} y1={y} x2={x + dx} y2={y} stroke="#287d70" strokeWidth="2.6" markerEnd={dx > 1 ? `url(#${markerId})` : undefined} />
      <line data-testid="vy-vector" x1={x} y1={y} x2={x} y2={y + dy} stroke="#365fc6" strokeWidth="2.6" markerEnd={Math.abs(dy) > 1 ? `url(#${markerId})` : undefined} />
      <text x={x + dx + 7} y={y + 5} fill="#287d70" fontSize="13">vₓ</text>
      <text x={x - 21} y={y + dy + (dy > 0 ? 15 : -7)} fill="#365fc6" fontSize="13">vᵧ</text>
    </g>}
    <circle cx={x} cy={y} r="11" fill={CORAL} opacity=".12" />
    <circle data-testid="component-ball" cx={x} cy={y} r="5.5" fill={CORAL} stroke="#f7f9f6" strokeWidth="1.5" />
    <line data-testid="gravity-vector" x1={gx} x2={gx} y1="80" y2="125" stroke="#9a6e24" strokeWidth="2" markerEnd={`url(#${markerId})`} />
    <text x={gx} y="65" textAnchor="middle" fill="#9a6e24" fontSize="13">g ↓</text>
    <text x={left} y={ground + 23} fill={MUTED} fontSize="12">0 m</text>
    <text x="350" y={ground + 23} textAnchor="end" fill={MUTED} fontSize="12">R = {metrics.range.toFixed(2)} m</text>
    {!compact && <line x1="411" x2="411" y1="55" y2="305" stroke={GRID} />}
    <g transform={compact ? "translate(28 281)" : "translate(447 79)"}>
      <text fill="#287d70" fontSize="11">HORIZONTAL · CONSTANT</text>
      <text data-testid="vx-readout" y="30" fill={INK} fontSize="26">{ball.vx.toFixed(2)}<tspan fontSize="12"> m/s</tspan></text>
      <text y="52" fill={MUTED} fontSize="12">vₓ = v₀ cos(θ)</text>
    </g>
    <g transform={compact ? "translate(235 281)" : "translate(447 196)"}>
      <text fill="#365fc6" fontSize="11">VERTICAL · CHANGING</text>
      <text data-testid="vy-readout" y="30" fill={INK} fontSize="26">{Math.abs(ball.vy) < .005 ? "0.00" : ball.vy.toFixed(2)}<tspan fontSize="12"> m/s</tspan></text>
      <text y="52" fill={MUTED} fontSize="12">vᵧ = vᵧ₀ − gt</text>
    </g>
    <text x={compact ? 210 : 390} y="355" textAnchor="middle" fill={MUTED} fontSize="12">t = {ball.time.toFixed(2)} s · g = {parameters.gravity} m/s² downward</text>
  </svg>;
}

export function RangeComparison({ parameters, progress, compact }: DiagramProps) {
  const angles = Array.from(new Set([30, 45, 60, parameters.angle]));
  const maximum = parameters.speed ** 2 / parameters.gravity;
  const left = compact ? 85 : 138;
  const width = compact ? 302 : 590;
  const duration = Math.max(...angles.map(angle => calculate(parameters, angle).flight_time), .01);
  return <svg viewBox={compact ? "0 0 420 365" : "0 0 780 365"} role="img" aria-label="Range comparison. Horizontal speed times flight time determines range. 30 and 60 degrees have equal range and 45 degrees has maximum range.">
    <text x={compact ? 22 : 39} y="35" fill={MUTED} fontSize={compact ? 11 : 12}>ANGLE</text>
    <text x={left} y="35" fill={MUTED} fontSize={compact ? 11 : 12}>{compact ? "SIDEWAYS SPEED × AIRTIME" : "HORIZONTAL SPEED × FLIGHT TIME = RANGE"}</text>
    {angles.map((angle, index) => {
      const metrics = calculate(parameters, angle);
      const color = COLORS[angle] || SELECTED_COLOR;
      const y = 80 + index * 64;
      const flight = sampleFlight(parameters, progress * duration, angle);
      return <g key={angle} data-testid={`range-row-${angle}`} opacity={parameters.angle === angle ? 1 : .85}>
        <text x={compact ? 23 : 43} y={y + 6} fill={color} fontSize={compact ? 21 : 23} fontWeight="500">{angle}°</text>
        <text x={left} y={y - 3} fill={INK} fontSize={compact ? 12 : 14}>{metrics.horizontal_velocity.toFixed(2)} × {metrics.flight_time.toFixed(2)}{!compact && "  (m/s × s)"}</text>
        <text x={left + width} y={y - 3} textAnchor="end" fill={color} fontSize={compact ? 13 : 14} fontWeight="600">{metrics.range.toFixed(2)} m</text>
        <rect x={left} y={y + 16} width={Math.max(0, metrics.range / maximum * width)} height="7" rx="3.5" fill="#e2e9df" stroke={color} strokeOpacity=".35" />
        <rect data-testid={`distance-bar-${angle}`} x={left} y={y + 16} width={Math.max(0, flight.x / maximum * width)} height="7" rx="3.5" fill={color} />
      </g>;
    })}
    <text x={compact ? 210 : 390} y="329" fill={MUTED} fontSize="12" textAnchor="middle">t = {(progress * duration).toFixed(2)} s · Fill: distance so far</text>
    <text x={compact ? 210 : 390} y="350" fill={MUTED} fontSize="12" textAnchor="middle">Outline: final range · 30° & 60° match</text>
  </svg>;
}
