"use client";

import { Activity, BarChart3, MessageCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type DashboardChartData = {
  volume: Array<{ label: string; value: number }>;
  sentiment: Array<{ label: string; value: number; color: string }>;
  themes: Array<{ label: string; value: number }>;
};

const sentimentColors = ["#10b981", "#94a3b8", "#f43f5e"];

export function DashboardCharts({ data }: { data: DashboardChartData }) {
  return (
    <section aria-label="Feedback analytics" className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr_0.95fr]">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity className="h-4 w-4 text-violet-600" /> Feedback volume</div><p className="mt-1 text-xs text-slate-500">Last 14 days</p></div>
          <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">Live data</span>
        </div>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.volume} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageCircle className="h-4 w-4 text-emerald-600" /> Sentiment mix</div>
        <p className="mt-1 text-xs text-slate-500">All feedback in this workspace</p>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.sentiment} dataKey="value" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={3}>
                {data.sentiment.map((item, index) => <Cell key={item.label} fill={sentimentColors[index % sentimentColors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
          {data.sentiment.map((item, index) => <span key={item.label} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: sentimentColors[index % sentimentColors.length] }} />{item.label}: {item.value}</span>)}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BarChart3 className="h-4 w-4 text-sky-600" /> Top themes</div>
        <p className="mt-1 text-xs text-slate-500">Most referenced topics</p>
        <div className="mt-4 h-56">
          {data.themes.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Themes will appear as feedback is classified.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.themes.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="label" width={82} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
