import { useState, useEffect } from 'react';

function calc(deadline) {
  const diff = Number(deadline) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return { display: '00:00:00:00', isUrgent: false, done: true };
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = n => String(n).padStart(2, '0');
  return {
    display: `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`,
    isUrgent: diff < 86400,
    done: false,
  };
}

export function useCountdown(deadline) {
  const [state, setState] = useState(() => calc(deadline));

  useEffect(() => {
    setState(calc(deadline));
    if (calc(deadline).done) return;
    const id = setInterval(() => setState(calc(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return state;
}
