import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ErrorBar } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function SporeLoadCard({
  experiment,
  selectedSporeLoadGraphFactors,
  toggleSporeLoadGraphFactor,
  facetSporeLoadFactor,
  setFacetSporeLoadFactor,
  setSelectedSporeLoadGraphFactors,
  excludeZeroSporeLoad,
  setExcludeZeroSporeLoad,
  sporeLoadChartResult,
  sporeLoadFacetLevels,
  getSporeLoadChartData,
}) {
  const { t } = useTranslation();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('dashboard.sporeLoadByCategory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Select factors to group by:</p>
            <div className="flex flex-wrap gap-4">
              {experiment.factors?.map(factor => (
                <div key={factor.name} className="flex items-center gap-2">
                  <Checkbox
                    id={`spore-load-graph-${factor.name}`}
                    checked={selectedSporeLoadGraphFactors.includes(factor.name)}
                    onCheckedChange={() => toggleSporeLoadGraphFactor(factor.name)}
                    disabled={facetSporeLoadFactor === factor.name}
                  />
                  <label htmlFor={`spore-load-graph-${factor.name}`} className="text-sm cursor-pointer">
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
              value={facetSporeLoadFactor || ''}
              onChange={(e) => {
                const value = e.target.value || null;
                setFacetSporeLoadFactor(value);
                if (value && selectedSporeLoadGraphFactors.includes(value)) {
                  setSelectedSporeLoadGraphFactors(selectedSporeLoadGraphFactors.filter(f => f !== value));
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
              id="exclude-zero-spore-load"
              checked={excludeZeroSporeLoad}
              onCheckedChange={setExcludeZeroSporeLoad}
            />
            <label htmlFor="exclude-zero-spore-load" className="text-sm cursor-pointer">
              {t('dashboard.excludeZeroSpores')}
            </label>
          </div>
        </div>

        {selectedSporeLoadGraphFactors.length > 0 ? (
          !facetSporeLoadFactor ? (
            <div>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={sporeLoadChartResult.boxData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                  <YAxis label={{ value: 'Mean Spore Load ± 95% CI', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border rounded p-2 shadow text-sm">
                            <p className="font-semibold">{d.name}</p>
                            <p>n = {d.n}</p>
                            <p>Mean: {d.mean?.toFixed(0)}</p>
                            <p>SD: {d.std?.toFixed(0)}</p>
                            <p>SE: {d.se?.toFixed(0)}</p>
                            <p>95% CI: [{(d.mean - d.ci95)?.toFixed(0)}, {(d.mean + d.ci95)?.toFixed(0)}]</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mean" fill="#9333ea" name="Mean Spore Load">
                    <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#581c87" />
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
                    {sporeLoadChartResult.boxData.map((box) => (
                      <tr key={box.name} className="border-b">
                        <td className="p-2 font-medium">{box.name}</td>
                        <td className="p-2 text-right">{box.n}</td>
                        <td className="p-2 text-right">{box.mean?.toFixed(0)}</td>
                        <td className="p-2 text-right">{box.std?.toFixed(0)}</td>
                        <td className="p-2 text-right">{box.se?.toFixed(0)}</td>
                        <td className="p-2 text-right">[{(box.mean - box.ci95)?.toFixed(0)}, {(box.mean + box.ci95)?.toFixed(0)}]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sporeLoadFacetLevels.map(level => {
                const facetResult = getSporeLoadChartData(level);
                return (
                  <div key={level} className="border rounded-lg p-4">
                    <h3 className="text-center font-semibold mb-3">{facetSporeLoadFactor}: {level}</h3>
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
                                  <p>n={d.n}, Mean={d.mean?.toFixed(0)} ± {d.ci95?.toFixed(0)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="mean" fill="#9333ea" name="Mean">
                          <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#581c87" />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
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