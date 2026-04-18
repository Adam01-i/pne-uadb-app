interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose';
  loading?: boolean;
}

const colorMap = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'bg-indigo-100 text-indigo-600',  val: 'text-indigo-700' },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',   val: 'text-amber-700' },
  purple:  { bg: 'bg-purple-50',  icon: 'bg-purple-100 text-purple-600',  val: 'text-purple-700' },
  rose:    { bg: 'bg-rose-50',    icon: 'bg-rose-100 text-rose-600',    val: 'text-rose-700' },
};

export default function StatsCard({ label, value, icon, color, loading }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className={`card p-5 flex items-center gap-4 ${c.bg}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-12 bg-slate-200 rounded animate-pulse mb-1" />
        ) : (
          <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        )}
        <p className="text-slate-600 text-sm">{label}</p>
      </div>
    </div>
  );
}
