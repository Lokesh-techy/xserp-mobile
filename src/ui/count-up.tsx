/** @author Lokesh */
import { useEffect, useRef, useState } from 'react';

import { Text, type TextVariant } from './text';

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const tweenValue = (from: number, to: number, t: number) => Math.round(from + (to - from) * easeOutCubic(Math.min(1, Math.max(0, t))));

const DURATION = 600;

/** A number that glides to its new value instead of jumping (used for live counts). */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const began = Date.now();
    let frame = 0;
    const step = () => {
      const t = (Date.now() - began) / DURATION;
      const next = tweenValue(start, value, t);
      from.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

type Props = { value: number; format?: (n: number) => string; variant?: TextVariant; color?: string; weight?: Parameters<typeof Text>[0]['weight']; style?: Parameters<typeof Text>[0]['style'] };

export function CountUp({ value, format = String, ...text }: Props) {
  return <Text {...text}>{format(useCountUp(value))}</Text>;
}
