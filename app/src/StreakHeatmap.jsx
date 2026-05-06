import { useMemo } from 'react';

// GitHub-style year heatmap of training volume per day.
export default function StreakHeatmap({ historico, color = '#00d4ff' }) {
  const { weeks, max } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 7 * 25); // ~6 months back
    // Align start to Sunday
    start.setDate(start.getDate() - start.getDay());

    const dayMap = {};
    historico.forEach(s => {
      const d = new Date(s.data);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const vol = s.exercicios.reduce((a, ex) => a + ex.series.reduce((b, sr) => b + (Number(sr.peso) || 0) * (Number(sr.reps) || 0), 0), 0);
      dayMap[key] = (dayMap[key] || 0) + vol;
    });

    const weeks = [];
    const cursor = new Date(start);
    let max = 1;
    while (cursor <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10);
        const vol = dayMap[key] || 0;
        if (vol > max) max = vol;
        week.push({ key, date: new Date(cursor), vol });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, max };
  }, [historico]);

  function colorFor(vol) {
    if (vol === 0) return 'rgba(255,255,255,0.04)';
    const t = Math.min(1, vol / max);
    const a = 0.15 + t * 0.85;
    return color + Math.round(a * 255).toString(16).padStart(2, '0');
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map((d) => (
              <div key={d.key} title={`${d.key}: ${d.vol.toLocaleString('pt-BR')}kg`}
                className="w-[10px] h-[10px]"
                style={{ background: colorFor(d.vol), boxShadow: d.vol > 0 ? `0 0 4px ${color}80` : 'none' }}/>
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-end items-center gap-1 mt-2 text-[8px] font-mono text-gray-500 tracking-widest">
        MENOS
        {[0.1, 0.3, 0.5, 0.75, 1].map(t => (
          <div key={t} className="w-[8px] h-[8px]" style={{ background: color, opacity: t }}/>
        ))}
        MAIS
      </div>
    </div>
  );
}
