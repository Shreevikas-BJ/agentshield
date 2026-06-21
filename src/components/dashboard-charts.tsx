"use client";

import type { ReactNode } from "react";
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
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartDatum = { name: string; value: number; agent?: string };

type DashboardChartsProps = {
  reliabilityTrend: ChartDatum[];
  passFailRate: ChartDatum[];
  failuresByCategory: ChartDatum[];
  owaspRisks: ChartDatum[];
  severityDistribution: ChartDatum[];
  regressionStatus: ChartDatum[];
  modelCallsByProvider: ChartDatum[];
  averageLatency: ChartDatum[];
};

const colors = ["#67e8f9", "#f87171", "#fbbf24", "#34d399", "#c084fc", "#fb7185"];

export function DashboardCharts(props: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Reliability over runs">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={props.reliabilityTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={axisTick} />
            <YAxis domain={[0, 100]} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke="#67e8f9" strokeWidth={2} dot={{ fill: "#67e8f9" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <PieChartCard title="Pass / fail / review" data={props.passFailRate} />

      <BarChartCard title="OWASP risk breakdown" data={props.owaspRisks} color="#fb7185" angled />
      <BarChartCard title="Failures by category" data={props.failuresByCategory} color="#f87171" angled />
      <PieChartCard title="Severity distribution" data={props.severityDistribution} />
      <BarChartCard title="Regression test status" data={props.regressionStatus} color="#34d399" />
      <BarChartCard title="Groq vs Gemini calls" data={props.modelCallsByProvider} color="#67e8f9" />
      <BarChartCard title="Average provider latency" data={props.averageLatency} color="#fbbf24" />
    </div>
  );
}

function PieChartCard({ title, data }: { title: string; data: ChartDatum[] }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
            {data.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BarChartCard({
  title,
  data,
  color,
  angled = false,
}: {
  title: string;
  data: ChartDatum[];
  color: string;
  angled?: boolean;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="name"
            tick={axisTick}
            interval={0}
            angle={angled ? -20 : 0}
            textAnchor={angled ? "end" : "middle"}
            height={angled ? 88 : 40}
          />
          <YAxis allowDecimals={false} tick={axisTick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>;
}

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};
