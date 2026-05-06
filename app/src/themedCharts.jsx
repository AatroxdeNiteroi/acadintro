import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const AXIS_STYLE = { fontSize: 9, fontFamily: 'monospace' };
const GRID_STROKE = '#0e2533';

function CustomTooltip({ active, payload, label, accent = '#00d4ff', unit = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-black/95 border-l-2 px-3 py-2 font-mono"
      style={{
        borderColor: accent,
        boxShadow: `0 0 14px ${accent}40`,
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)',
      }}>
      <div className="text-[9px] text-gray-500 tracking-widest mb-0.5">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[11px] flex items-center gap-2">
          <span className="w-1.5 h-1.5" style={{ backgroundColor: p.color, boxShadow: `0 0 4px ${p.color}` }}/>
          <span className="text-cyan-100 font-bold" style={{ color: p.color, textShadow: `0 0 8px ${p.color}80` }}>
            {p.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CyberLine({ data, dataKey, color = '#00d4ff', height = 160, unit = '', xKey = 'data' }) {
  const filterId = `glow-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE}/>
        <XAxis dataKey={xKey} stroke="#475569" style={AXIS_STYLE} tickLine={false}/>
        <YAxis stroke="#475569" style={AXIS_STYLE} tickLine={false}/>
        <Tooltip content={<CustomTooltip accent={color} unit={unit}/>} cursor={{ stroke: color + '60', strokeDasharray: '2 2' }}/>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 1 }}
          filter={`url(#${filterId})`}
          animationDuration={600}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CyberBar({ data, dataKey, color = '#ff2eaa', height = 140, unit = '', xKey = 'data' }) {
  const gradId = `bargrad-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.3"/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE}/>
        <XAxis dataKey={xKey} stroke="#475569" style={AXIS_STYLE} tickLine={false}/>
        <YAxis stroke="#475569" style={AXIS_STYLE} tickLine={false}/>
        <Tooltip content={<CustomTooltip accent={color} unit={unit}/>} cursor={{ fill: color + '15' }}/>
        <Bar dataKey={dataKey} fill={`url(#${gradId})`} animationDuration={500}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
