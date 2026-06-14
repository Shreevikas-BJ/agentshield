"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartDatum = {
  name: string;
  value: number;
};

type DashboardChartsProps = {
  passFailRate: ChartDatum[];
  failuresByCategory: ChartDatum[];
  modelCallsByProvider: ChartDatum[];
  averageLatency: ChartDatum[];
};

const colors = ["#67e8f9", "#f87171", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"];

export function DashboardCharts({
  passFailRate,
  failuresByCategory,
  modelCallsByProvider,
  averageLatency,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Pass / fail rate">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={passFailRate} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
              {passFailRate.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Failures by category">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={failuresByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={axisTick} interval={0} angle={-20} textAnchor="end" height={74} />
            <YAxis allowDecimals={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Model calls by provider">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={modelCallsByProvider}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={axisTick} />
            <YAxis allowDecimals={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#67e8f9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Average latency">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={averageLatency}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={axisTick} />
            <YAxis tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
};
