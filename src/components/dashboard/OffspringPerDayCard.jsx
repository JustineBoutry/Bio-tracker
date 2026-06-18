import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ErrorBar } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function OffspringPerDayCard({
  experiment,
  selectedOffspringPerDayGraphFactors,
  toggleOffspringPerDayGraphFactor,
  facetOffspringPerDayFactor,
  setFacetOffspringPerDayFactor,
  setSelectedOffspringPerDayGraphFactors,
  offspringPerDayByRedStatus,
  setOffspringPerDayByRedStatus,
  offspringPerDayChartResult,
  offspringPerDayFacetLevels,
  getOffspringPerDayChartData,
}) {
  const { t } = useTranslation();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Offspring Per Day Lived by Group</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{t('dashboard.selectFactors')}</p>
            <div className="flex flex-wrap gap-4">
              {experiment.factors?.map(factor => (
                <div key={factor.name} className="flex items-center gap-2">
                  <Checkbox
                    id={`offspring-per-day-graph-${factor.name}`}
                    checked={selectedOffspringPerDayGraphFactors.includes(factor.name)}
                    onCheckedChange={() => toggleOffspringPerDayGraphFactor(factor.name)}
                    disabled={facetOffspringPerDayFactor === factor.name}
                  />
                  <label htmlFor={`offspring-per-day-graph-${factor.name}`} className="text-sm cursor-pointer">
                    {factor.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Facet by (optional):</p>
            <select
              className="border rounded p-2 text-sm"
              value={facetOffspringPerDayFactor || ''}
              onChange={(e) => {
                const value = e.target.value || null;
                setFacetOffspringPerDayFactor(value);
                if (value && selectedOffspringPerDayGraphFactors.includes(value)) {
                  setSelectedOffspringPerDayGraphFactors(selectedOffspringPerDayGraphFactors.filter(f => f !== value));
                }
              }}
            >
              <option value="">None</option>
              {experiment.factors?.map(factor => (
                <option key={factor.name} value={factor.name}>{factor.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="offspring-per-day-by-red"
              checked={offspringPerDayByRedStatus}
              onCheckedChange={setOffspringPerDayByRedStatus}
            />
            <label htmlFor="offspring-per-day-by-red" className="text-sm cursor-pointer">
              {t('dashboard.differentiateByRed')}
            </label>
          </div>
        </div>

        {selectedOffspringPerDayGraphFactors.length > 0 ? (
          !facetOffspringPerDayFactor ? (
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={offspringPerDayChartResult.boxData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                  <YAxis label={{ value: 'Mean Offspring/Day ± 95% CI', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border rounded p-2 shadow text-sm">
                            <p className="font-semibold">{d.name}</p>
                            <p>n = {d.n}</p>
                            <p>Mean: {d.mean?.toFixed(3)}</p>
                            <p>SD: {d.std?.toFixed(3)}</p>
                            <p>SE: {d.se?.toFixed(3)}</p>
                            <p>95% CI: [{(d.mean - d.ci95)?.toFixed(3)}, {(d.mean + d.ci95)?.toFixed(3)}]</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mean" fill="#0ea5e9" name="Mean Offspring/Day">
                    <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#0369a1" />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="p-2 text-left">Group</th>
                      <th className="p-2 text-right">n</th>
                      <th className="p-2 text-right">Mean</th>
                      <th className="p-2 text-right">SD</th>
                      <th className="p-2 text-right">SE</th>
                      <th className="p-2 text-right">95% CI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offspringPerDayChartResult.boxData.map((box) => (
                      <tr key={box.name} className="border-b">
                        <td className="p-2 font-medium">{box.name}</td>
                        <td className="p-2 text-right">{box.n}</td>
                        <td className="p-2 text-right">{box.mean?.toFixed(3)}</td>
                        <td className="p-2 text-right">{box.std?.toFixed(3)}</td>
                        <td className="p-2 text-right">{box.se?.toFixed(3)}</td>
                        <td className="p-2 text-right">[{(box.mean - box.ci95)?.toFixed(3)}, {(box.mean + box.ci95)?.toFixed(3)}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {offspringPerDayFacetLevels.map(level => {
                const facetResult = getOffspringPerDayChartData(level);
                return (
                  <div key={level} className="border rounded-lg p-4">
                    <h3 className="text-center font-semibold mb-3">{facetOffspringPerDayFactor}: {level}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={facetResult.boxData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} interval={0} />
                        <YAxis fontSize={12} label={{ value: 'Mean ± 95% CI', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border rounded p-2 shadow text-xs">
                                  <p className="font-semibold">{d.name}</p>
                                  <p>n={d.n}, Mean={d.mean?.toFixed(3)} ± {d.ci95?.toFixed(3)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="mean" fill="#0ea5e9" name="Mean">
                          <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#0369a1" />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="flex justify-around text-xs mt-2">
                      {facetResult.boxData.map((box) => (
                        <div key={box.name} className="text-center">
                          <div className="text-gray-500">n={box.n}, μ={box.mean?.toFixed(3)} ± {box.ci95?.toFixed(3)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select at least one factor to display the chart
          </div>
        )}
      </CardContent>
    </Card>
  );
}