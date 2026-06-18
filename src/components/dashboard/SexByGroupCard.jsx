import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import StatisticalTestPanel from "./StatisticalTestPanel";
import { useTranslation } from 'react-i18next';

export default function SexByGroupCard({
  experiment, selectedSexGraphFactors, toggleSexGraphFactor,
  facetSexFactor, setFacetSexFactor, setSelectedSexGraphFactors,
  sexChartData, sexFacetLevels, getSexChartData,
  selectedSexBars, handleSexBarClick, setSelectedSexBars,
}) {
  const { t } = useTranslation();

  const renderBars = (data, onClickFn) => (
    <BarChart data={data} onClick={(e) => e?.activePayload?.[0] && onClickFn(e.activePayload[0].payload)}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
      <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
      <Tooltip formatter={(v, n) => [`${v.toFixed(1)}%`, n]} />
      <Legend />
      <Bar dataKey="male" stackId="a" name="Male" cursor="pointer">
        {data.map((e, i) => <Cell key={i} fill={selectedSexBars.find(b => b.name === e.name) ? "#ea580c" : "#f97316"} opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === e.name) ? 0.3 : 1} />)}
      </Bar>
      <Bar dataKey="female" stackId="a" name="Female" cursor="pointer">
        {data.map((e, i) => <Cell key={i} fill={selectedSexBars.find(b => b.name === e.name) ? "#78350f" : "#92400e"} opacity={selectedSexBars.length > 0 && !selectedSexBars.find(b => b.name === e.name) ? 0.3 : 1} />)}
      </Bar>
    </BarChart>
  );

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>{t('dashboard.sexByGroup')}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Select factors to group by:</p>
            <div className="flex flex-wrap gap-4">
              {experiment.factors?.map(factor => (
                <div key={factor.name} className="flex items-center gap-2">
                  <Checkbox id={`sex-graph-${factor.name}`} checked={selectedSexGraphFactors.includes(factor.name)} onCheckedChange={() => toggleSexGraphFactor(factor.name)} disabled={facetSexFactor === factor.name} />
                  <label htmlFor={`sex-graph-${factor.name}`} className="text-sm cursor-pointer">{factor.name}</label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Facet by (optional):</p>
            <select className="border rounded p-2 text-sm" value={facetSexFactor || ''} onChange={(e) => { const v = e.target.value || null; setFacetSexFactor(v); if (v && selectedSexGraphFactors.includes(v)) setSelectedSexGraphFactors(selectedSexGraphFactors.filter(f => f !== v)); }}>
              <option value="">None</option>
              {experiment.factors?.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>
        </div>

        {selectedSexGraphFactors.length > 0 ? (
          !facetSexFactor ? (
            <>
              <ResponsiveContainer width="100%" height={400}>{renderBars(sexChartData, handleSexBarClick)}</ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600 text-center">Click on bars to select groups for statistical testing</div>
              {selectedSexBars.length > 0 && <div className="mt-4"><StatisticalTestPanel selectedBars={selectedSexBars} onClear={() => setSelectedSexBars([])} chartType="sex" /></div>}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sexFacetLevels.map(level => (
                  <div key={level} className="border rounded-lg p-4">
                    <h3 className="text-center font-semibold mb-3">{facetSexFactor}: {level}</h3>
                    <ResponsiveContainer width="100%" height={300}>{renderBars(getSexChartData(level), handleSexBarClick)}</ResponsiveContainer>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">Click on bars to select groups for statistical testing</div>
              {selectedSexBars.length > 0 && <div className="mt-4"><StatisticalTestPanel selectedBars={selectedSexBars} onClear={() => setSelectedSexBars([])} chartType="sex" /></div>}
            </>
          )
        ) : (
          <div className="text-center py-12 text-gray-500">Select at least one factor to display the chart</div>
        )}
      </CardContent>
    </Card>
  );
}