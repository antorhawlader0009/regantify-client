import { Suspense, lazy, type ComponentProps } from 'react';
import type { GradientBarChart as BarT } from './GradientBarChart';
import type { GradientAreaChart as AreaT } from './GradientAreaChart';
import type { GradientDonut as DonutT } from './GradientDonut';
import type { RadialRings as RingsT } from './RadialRings';
import type { Sparkline as SparkT } from './Sparkline';

/**
 * The chart kit loaded on demand. The admin Dashboard is one of the few pages App.tsx imports eagerly, so if it imported the charts directly,
 * Recharts (lib-charts, about 120 kB gzipped) would be in every visitor's first download, vendors included. A page that is itself lazy can import
 * from './index' instead; an eager one must use these.
 */
const Bar = lazy(() => import('./GradientBarChart').then((m) => ({ default: m.GradientBarChart })));
const Area = lazy(() => import('./GradientAreaChart').then((m) => ({ default: m.GradientAreaChart })));
const Donut = lazy(() => import('./GradientDonut').then((m) => ({ default: m.GradientDonut })));
const Rings = lazy(() => import('./RadialRings').then((m) => ({ default: m.RadialRings })));
const Spark = lazy(() => import('./Sparkline').then((m) => ({ default: m.Sparkline })));

const Placeholder = ({ height }: { height: number }) => <div className="animate-pulse rounded-xl bg-[var(--console-skeleton)]" style={{ height }} aria-hidden />;

export function LazyGradientBarChart(props: ComponentProps<typeof BarT>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 280} />}>
      <Bar {...props} />
    </Suspense>
  );
}

export function LazyGradientAreaChart(props: ComponentProps<typeof AreaT>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 280} />}>
      <Area {...props} />
    </Suspense>
  );
}

export function LazyGradientDonut(props: ComponentProps<typeof DonutT>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 240} />}>
      <Donut {...props} />
    </Suspense>
  );
}

export function LazyRadialRings(props: ComponentProps<typeof RingsT>) {
  return (
    <Suspense fallback={<Placeholder height={props.height ?? 260} />}>
      <Rings {...props} />
    </Suspense>
  );
}

export function LazySparkline(props: ComponentProps<typeof SparkT>) {
  return (
    <Suspense fallback={<div style={{ height: props.height ?? 40 }} aria-hidden />}>
      <Spark {...props} />
    </Suspense>
  );
}
