import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, ComposedChart, ErrorBar } from 'recharts';

export default function CustomGraphic({ graphic, experiment, allIndividuals }) {
  const [selectedFactors, setSelectedFactors] = useState(graphic.selected_factors || []);
  const [facetFactor, setFacetFactor] = useState(graphic.facet_factor || null);

  const toggleFactor = (factorName) => {
    if (selectedFactors.includes(factorName)) {
      setSelectedFactors(selectedFactors.filter(f => f !== factorName));
    } else {
      setSelectedFactors([...selectedFactors, factorName]);
    }
  };

  const getChartData = (filterByFacet = null) => {
    if (selectedFactors.length === 0) return [];

    let filteredInds = filterByFacet 
      ? allIndividuals.filter(ind => ind.factors?.[facetFactor] === filterByFacet)
      : allIndividuals;

    // Apply filters
    if (graphic.filters?.exclude_males) {
      filteredInds = filteredInds.filter(ind => ind.sex !== 'male');
    }
    if (graphic.filters?.alive_only) {
      filteredInds = filteredInds.filter(ind => ind.alive);
    }
    if (graphic.filters?.infected_only) {
      filteredInds = filteredInds.filter(ind => ind.infected === 'confirmed Yes');
    }
    if (graphic.filters?.red_status === 'red_only') {
      filteredInds = filteredInds.filter(ind => ind.red_confirmed);
    } else if (graphic.filters?.red_status === 'non_red_only') {
      filteredInds = filteredInds.filter(ind => !ind.red_confirmed);
    }

    const groups = {};
    filteredInds.forEach(ind => {
      let groupKey = selectedFactors
        .map(factor => ind.factors?.[factor] || 'Unknown')
        .join(' - ');
      
      if (graphic.differentiate_by_red) {
        const redStatus = ind.red_confirmed ? 'Red+' : 'Red-';
        groupKey = groupKey ? `${groupKey} | ${redStatus}` : redStatus;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { name: groupKey, values: [], count: 0 };
      }

      // Calculate value based on trait
      let value;
      if (graphic.trait === 'survival') {
        groups[groupKey].count++;
        value = ind.alive ? 1 : 0;
      } else if (graphic.trait === 'infection') {
        groups[groupKey].count++;
        value = ind.infected === 'confirmed Yes' ? 1 : 0;
      } else if (graphic.trait === 'reproduction') {
        groups[groupKey].count++;
        value = (ind.cumulative_offspring || 0) > 0 ? 1 : 0;
      } else if (graphic.trait === 'offspring') {
        value = Number(ind.cumulative_offspring) || 0;
      } else if (graphic.trait === 'red_signal') {
        groups[groupKey].count++;
        value = ind.red_confirmed ? 1 : 0;
      }

      if (value !== undefined) {
        groups[groupKey].values.push(value);
      }
    });

    // Calculate statistics
    return Object.values(groups).map(group => {
      const values = group.values;
      const n = values.length;
      if (n === 0) return { name: group.name, mean: 0, n: 0 };

      const mean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
      const std = Math.sqrt(variance);
      const se = std / Math.sqrt(n);
      const ci95 = 1.96 * se;

      // For proportions (survival, infection, etc), convert to percentage
      const isProportionTrait = ['survival', 'infection', 'reproduction', 'red_signal'].includes(graphic.trait);
      const displayMean = isProportionTrait ? mean * 100 : mean;
      const displayCi95 = isProportionTrait ? ci95 * 100 : ci95;

      return {
        name: group.name,
        mean: displayMean,
        ci95: displayCi95,
        n,
        std,
        se
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFacetLevels = () => {
    if (!facetFactor) return null;
    const factor = experiment?.factors?.find(f => f.name === facetFactor);
    return factor?.levels || [];
  };

  const chartData = !facetFactor ? getChartData() : null;
  const facetLevels = getFacetLevels();

  const yAxisLabel = graphic.y_axis_label || (
    ['survival', 'infection', 'reproduction', 'red_signal'].includes(graphic.trait)
      ? 'Proportion (%)'
      : 'Mean Value'
  );

  const xAxisLabel = graphic.x_axis_label || 'Groups';

  if (selectedFactors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{graphic.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Select at least one factor to display the chart
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{graphic.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {graphic.is_interactive && (
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Select factors to group by:</p>
              <div className="flex flex-wrap gap-4">
                {experiment.factors?.map(factor => (
                  <div key={factor.name} className="flex items-center gap-2">
                    <Checkbox
                      id={`${graphic.name}-${factor.name}`}
                      checked={selectedFactors.includes(factor.name)}
                      onCheckedChange={() => toggleFactor(factor.name)}
                      disabled={facetFactor === factor.name}
                    />
                    <label htmlFor={`${graphic.name}-${factor.name}`} className="text-sm cursor-pointer">
                      {factor.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {graphic.allow_faceting && (
              <div>
                <p className="text-sm font-medium mb-2">Facet by (optional):</p>
                <select
                  className="border rounded p-2 text-sm"
                  value={facetFactor || ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setFacetFactor(value);
                    if (value && selectedFactors.includes(value)) {
                      setSelectedFactors(selectedFactors.filter(f => f !== value));
                    }
                  }}
                >
                  <option value="">None</option>
                  {experiment.factors?.map(factor => (
                    <option key={factor.name} value={factor.name}>
                      {factor.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {!facetFactor ? (
          <ResponsiveContainer width="100%" height={400}>
            {graphic.chart_type === 'bar' ? (
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                  label={{ value: xAxisLabel, position: 'insideBottom', offset: -70 }}
                />
                <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border rounded p-2 shadow text-sm">
                          <p className="font-semibold">{data.name}</p>
                          <p>n = {data.n}</p>
                          <p>Mean: {data.mean?.toFixed(2)}</p>
                          <p>95% CI: [{(data.mean - data.ci95)?.toFixed(2)}, {(data.mean + data.ci95)?.toFixed(2)}]</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="mean" fill="#3b82f6" name={graphic.trait}>
                  <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#1e40af" />
                </Bar>
              </ComposedChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval={0}
                  label={{ value: xAxisLabel, position: 'insideBottom', offset: -70 }}
                />
                <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mean" stroke="#3b82f6" strokeWidth={2} name={graphic.trait} />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facetLevels.map(level => {
              const facetData = getChartData(level);
              return (
                <div key={level} className="border rounded-lg p-4">
                  <h3 className="text-center font-semibold mb-3">{facetFactor}: {level}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    {graphic.chart_type === 'bar' ? (
                      <ComposedChart data={facetData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name"
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis fontSize={12} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="mean" fill="#3b82f6" name={graphic.trait}>
                          <ErrorBar dataKey="ci95" width={4} strokeWidth={2} stroke="#1e40af" />
                        </Bar>
                      </ComposedChart>
                    ) : (
                      <LineChart data={facetData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name"
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="mean" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}