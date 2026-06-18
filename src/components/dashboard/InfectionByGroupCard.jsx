import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import StatisticalTestPanel from "./StatisticalTestPanel";
import { useTranslation } from 'react-i18next';

export default function InfectionByGroupCard({
  experiment, selectedInfectionGraphFactors, toggleInfectionGraphFactor,
  facetInfectionFactor, setFacetInfectionFactor, setSelectedInfectionGraphFactors,
  excludeNotTested, setExcludeNotTested,
  infectionChartData, infectionFacetLevels, getInfectionChartData,
  selectedInfectionBars, handleInfectionBarClick, setSelectedInfectionBars,
}) {
  const { t } = useTranslation();

  const renderBars = (data, onClickFn) => (
    <BarChart data={data} onClick={(e) => e?.activePayload?.[0] && onClickFn(e.activePayload[0].payload)}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
      <YAxis label={{ value: 'Proportion (%)', angle: -90, position: 'insideLeft' }} />
      <Tooltip formatter={(v, n) => [`${v.toFixed(1)}%`, n]} />
      <Legend />
      <Bar dataKey="confirmedYes" stackId="a" name="Confirmed Yes" cursor="pointer">
        {data.map((e, i) => <Cell key={i} fill={selectedInfectionBars.find(b => b.name === e.name) ? "#dc2626" : "#ef4444"} opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === e.name) ? 0.3 : 1} />)}
      </Bar>
      <Bar dataKey="confirmedNo" stackId="a" name="Confirmed No" cursor="pointer">
        {data.map((e, i) => <Cell key={i} fill={selectedInfectionBars.find(b => b.name === e.name) ? "#16a34a" : "#22c55e"} opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === e.name) ? 0.3 : 1} />)}
      </Bar>
      {!excludeNotTested && (
        <Bar dataKey="notTested" stackId="a" name="Not Tested" cursor="pointer">
          {data.map((e, i) => <Cell key={i} fill={selectedInfectionBars.find(b => b.name === e.name) ? "#6b7280" : "#9ca3af"} opacity={selectedInfectionBars.length > 0 && !selectedInfectionBars.find(b => b.name === e.name) ? 0.3 : 1} />)}
        </Bar>
      )}
    </BarChart>
  );

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>{t('dashboard.infectionByGroup')}</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Select factors to group by:</p>
            <div className="flex flex-wrap gap-4">
              {experiment.factors?.map(factor => (
                <div key={factor.name} className="flex items-center gap-2">
                  <Checkbox id={`infection-graph-${factor.name}`} checked={selectedInfectionGraphFactors.includes(factor.name)} onCheckedChange={() => toggleInfectionGraphFactor(factor.name)} disabled={facetInfectionFactor === factor.name} />
                  <label htmlFor={`infection-graph-${factor.name}`} className="text-sm cursor-pointer">{factor.name}</label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Facet by (optional):</p>
            <select className="border rounded p-2 text-sm" value={facetInfectionFactor || ''} onChange={(e) => { const v = e.target.value || null; setFacetInfectionFactor(v); if (v && selectedInfectionGraphFactors.includes(v)) setSelectedInfectionGraphFactors(selectedInfectionGraphFactors.filter(f => f !== v)); }}>
              <option value="">None</option>
              {experiment.factors?.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="exclude-not-tested" checked={excludeNotTested} onCheckedChange={setExcludeNotTested} />
            <label htmlFor="exclude-not-tested" className="text-sm cursor-pointer">{t('dashboard.excludeNotTested')}</label>
          </div>
        </div>

        {selectedInfectionGraphFactors.length > 0 ? (
          !facetInfectionFactor ? (
            <>
              <ResponsiveContainer width="100%" height={400}>{renderBars(infectionChartData, handleInfectionBarClick)}</ResponsiveContainer>
              <div className="mt-4 text-sm text-gray-600 text-center">Click on bars to select groups for statistical testing</div>
              {selectedInfectionBars.length > 0 && <div className="mt-4"><StatisticalTestPanel selectedBars={selectedInfectionBars} onClear={() => setSelectedInfectionBars([])} chartType="infection" /></div>}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {infectionFacetLevels.map(level => (
                  <div key={level} className="border rounded-lg p-4">
                    <h3 className="text-center font-semibold mb-3">{facetInfectionFactor}: {level}</h3>
                    <ResponsiveContainer width="100%" height={300}>{renderBars(getInfectionChartData(level), handleInfectionBarClick)}</ResponsiveContainer>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">Click on bars to select groups for statistical testing</div>
              {selectedInfectionBars.length > 0 && <div className="mt-4"><StatisticalTestPanel selectedBars={selectedInfectionBars} onClear={() => setSelectedInfectionBars([])} chartType="infection" /></div>}
            </>
          )
        ) : (
          <div className="text-center py-12 text-gray-500">Select at least one factor to display the chart</div>
        )}
      </CardContent>
    </Card>
  );
}