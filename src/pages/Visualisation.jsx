import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useExperiment } from "../components/ExperimentContext";
import CustomGraphic from "../components/dashboard/CustomGraphic";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export default function Visualisation() {
  const { t } = useTranslation();
  const { activeExperimentId } = useExperiment();
  const queryClient = useQueryClient();
  const [dashboardGraphics, setDashboardGraphics] = useState([]);
  
  const { data: experiment } = useQuery({
    queryKey: ['experiment', activeExperimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: activeExperimentId });
      return exps[0];
    },
    enabled: !!activeExperimentId,
  });

  const { data: allIndividuals = [] } = useQuery({
    queryKey: ['individuals', activeExperimentId],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: activeExperimentId }),
    enabled: !!activeExperimentId,
  });

  useEffect(() => {
    if (experiment?.dashboard_graphics) {
      setDashboardGraphics(experiment.dashboard_graphics);
    }
  }, [experiment]);

  const addDashboardGraphic = () => {
    setDashboardGraphics([...dashboardGraphics, {
      name: "",
      trait: "survival",
      chart_type: "bar",
      x_axis: "factors",
      selected_factors: [],
      facet_factor: null,
      is_interactive: false,
      allow_faceting: false,
      filters: {
        exclude_males: false,
        exclude_not_tested: false,
        alive_only: false,
        infected_only: false,
        red_status: "all"
      },
      y_axis_label: "",
      x_axis_label: "",
      differentiate_by_red: false,
      show_statistics: false
    }]);
  };

  const updateGraphicName = (index, name) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].name = name;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicTrait = (index, trait) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].trait = trait;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicChartType = (index, type) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].chart_type = type;
    setDashboardGraphics(newGraphics);
  };

  const toggleGraphicFactor = (index, factorName) => {
    const newGraphics = [...dashboardGraphics];
    const factors = newGraphics[index].selected_factors || [];
    if (factors.includes(factorName)) {
      newGraphics[index].selected_factors = factors.filter(f => f !== factorName);
    } else {
      newGraphics[index].selected_factors = [...factors, factorName];
    }
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicFacet = (index, facet) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].facet_factor = facet || null;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicFilter = (index, filterKey, value) => {
    const newGraphics = [...dashboardGraphics];
    if (!newGraphics[index].filters) {
      newGraphics[index].filters = {};
    }
    newGraphics[index].filters[filterKey] = value;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicAxisLabel = (index, axis, label) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index][`${axis}_axis_label`] = label;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicRedDifferentiation = (index, value) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].differentiate_by_red = value;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicShowStatistics = (index, value) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].show_statistics = value;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicXAxis = (index, value) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].x_axis = value;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicInteractive = (index, value) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].is_interactive = value;
    setDashboardGraphics(newGraphics);
  };

  const updateGraphicAllowFaceting = (index, value) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics[index].allow_faceting = value;
    setDashboardGraphics(newGraphics);
  };

  const removeGraphic = (index) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics.splice(index, 1);
    setDashboardGraphics(newGraphics);
  };

  const saveDashboardGraphics = async () => {
    const filteredGraphics = dashboardGraphics.filter(g => g.name.trim());
    await base44.entities.Experiment.update(activeExperimentId, { dashboard_graphics: filteredGraphics });
    queryClient.invalidateQueries(['experiment', activeExperimentId]);
    alert('Dashboard graphics saved!');
  };

  if (!experiment) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Custom Visualizations</h1>
      <p className="text-gray-600 mb-6">Configure and view interactive graphics for your experiment data</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dashboard Graphics Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure custom interactive visualizations. Select traits to visualize, grouping factors, chart types, and filtering options.
          </p>
          {dashboardGraphics.map((graphic, index) => (
            <div key={index} className="border p-4 rounded space-y-3 bg-gray-50">
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium">Visualization Name</label>
                  <Input
                    value={graphic.name}
                    onChange={(e) => updateGraphicName(index, e.target.value)}
                    placeholder="e.g., Survival by Treatment"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium">Trait to Visualize</label>
                  <select
                    className="w-full border rounded p-2"
                    value={graphic.trait}
                    onChange={(e) => updateGraphicTrait(index, e.target.value)}
                  >
                    <option value="survival">Survival (Alive/Dead)</option>
                    <option value="infection">Infection Status</option>
                    <option value="reproduction">Reproduction</option>
                    <option value="offspring">Cumulative Offspring</option>
                    <option value="offspring_per_day">Offspring Per Day</option>
                    <option value="red_signal">Red Signal</option>
                    <option value="sex">Sex Distribution</option>
                    <option value="spore_load">Spore Load</option>
                    {experiment?.custom_traits?.filter(t => t.name).map(t => (
                      <option key={t.name} value={`custom:${t.name}`}>
                        {t.name} (custom)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium">Chart Type</label>
                  <select
                    className="w-full border rounded p-2"
                    value={graphic.chart_type}
                    onChange={(e) => updateGraphicChartType(index, e.target.value)}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line/Curve Chart</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium">X-Axis</label>
                  <select
                    className="w-full border rounded p-2"
                    value={graphic.x_axis || "factors"}
                    onChange={(e) => updateGraphicXAxis(index, e.target.value)}
                  >
                    <option value="factors">Grouping Factors</option>
                    <option value="time">Time</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Select Factors for Grouping:</label>
                <div className="flex flex-wrap gap-3">
                  {experiment?.factors?.filter(f => f.name).map(factor => (
                    <label key={factor.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(graphic.selected_factors || []).includes(factor.name)}
                        onChange={() => toggleGraphicFactor(index, factor.name)}
                        disabled={graphic.facet_factor === factor.name}
                        className="rounded"
                      />
                      <span className="text-sm">{factor.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Facet By (Optional):</label>
                <select
                  className="w-full border rounded p-2 max-w-xs"
                  value={graphic.facet_factor || ''}
                  onChange={(e) => updateGraphicFacet(index, e.target.value)}
                >
                  <option value="">None</option>
                  {experiment?.factors?.filter(f => f.name).map(factor => (
                    <option key={factor.name} value={factor.name}>
                      {factor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Interactive Graphic Options:</label>
                <div className="space-y-2 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.is_interactive || false}
                      onChange={(e) => updateGraphicInteractive(index, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Interactive Graphic (allow users to select grouping factors)</span>
                  </label>
                  {graphic.is_interactive && (
                    <label className="flex items-center gap-2 cursor-pointer ml-6">
                      <input
                        type="checkbox"
                        checked={graphic.allow_faceting || false}
                        onChange={(e) => updateGraphicAllowFaceting(index, e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Allow faceting option</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Filters & Options:</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.filters?.exclude_males || false}
                      onChange={(e) => updateGraphicFilter(index, 'exclude_males', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Exclude Males</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.filters?.exclude_not_tested || false}
                      onChange={(e) => updateGraphicFilter(index, 'exclude_not_tested', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Exclude Not Tested</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.filters?.alive_only || false}
                      onChange={(e) => updateGraphicFilter(index, 'alive_only', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Alive Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.filters?.infected_only || false}
                      onChange={(e) => updateGraphicFilter(index, 'infected_only', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Infected Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.differentiate_by_red || false}
                      onChange={(e) => updateGraphicRedDifferentiation(index, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Differentiate by Red Status</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={graphic.show_statistics || false}
                      onChange={(e) => updateGraphicShowStatistics(index, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Show Statistical Tests</span>
                  </label>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-600">Red Status Filter</label>
                  <select
                    className="w-full border rounded p-1 text-sm max-w-xs"
                    value={graphic.filters?.red_status || "all"}
                    onChange={(e) => updateGraphicFilter(index, 'red_status', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="red_only">Red Only</option>
                    <option value="non_red_only">Non-Red Only</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Axis Labels (Optional):</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">X-Axis Label</label>
                    <Input
                      value={graphic.x_axis_label || ''}
                      onChange={(e) => updateGraphicAxisLabel(index, 'x', e.target.value)}
                      placeholder="e.g., Treatment Groups"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Y-Axis Label</label>
                    <Input
                      value={graphic.y_axis_label || ''}
                      onChange={(e) => updateGraphicAxisLabel(index, 'y', e.target.value)}
                      placeholder="e.g., Survival Rate (%)"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeGraphic(index)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Visualization
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addDashboardGraphic}>
              <Plus className="w-4 h-4 mr-2" />
              Add Visualization
            </Button>
            <Button onClick={saveDashboardGraphics}>Save Dashboard Graphics</Button>
          </div>
        </CardContent>
      </Card>

      {experiment.dashboard_graphics && experiment.dashboard_graphics.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4 mt-8">Your Visualizations</h2>
          <div className="space-y-6">
            {experiment.dashboard_graphics.map((graphic, index) => (
              <CustomGraphic 
                key={index} 
                graphic={graphic} 
                experiment={experiment}
                allIndividuals={allIndividuals}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}