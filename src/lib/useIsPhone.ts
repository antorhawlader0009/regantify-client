import { useEffect, useState } from 'react';

const QUERY = '(max-width: 767px)';

/** True on a phone-sized screen (under 768px wide). Follows rotation and window resizing. */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}
