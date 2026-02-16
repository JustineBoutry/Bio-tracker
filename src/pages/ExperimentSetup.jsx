import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MatrixLayout from "../components/experiment/MatrixLayout";
import { useExperiment } from "../components/ExperimentContext";
import { useTranslation } from 'react-i18next';

export default function ExperimentSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeExperimentId, exitExperiment } = useExperiment();
  const experimentId = activeExperimentId;

  const [factors, setFactors] = useState([]);
  const [codeMode, setCodeMode] = useState('factor_based');
  const [codePrefix, setCodePrefix] = useState('ID-');
  const [codeStartingNumber, setCodeStartingNumber] = useState(1);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingLevel, setEditingLevel] = useState(null);
  const [editingLevelValue, setEditingLevelValue] = useState('');
  const [customTraits, setCustomTraits] = useState([]);
  const [dashboardGraphics, setDashboardGraphics] = useState([]);

  const { data: experiment } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: experimentId });
      return exps[0];
    },
    enabled: !!experimentId,
  });

  useEffect(() => {
    if (experiment?.factors) {
      setFactors(experiment.factors);
    }
    if (experiment?.code_generation_mode) {
      setCodeMode(experiment.code_generation_mode);
    }
    if (experiment?.code_prefix) {
      setCodePrefix(experiment.code_prefix);
    }
    if (experiment?.code_starting_number !== undefined) {
      setCodeStartingNumber(experiment.code_starting_number);
    }
    if (experiment?.experiment_name) {
      setNewName(experiment.experiment_name);
    }
    if (experiment?.custom_traits) {
      setCustomTraits(experiment.custom_traits);
    }
    if (experiment?.dashboard_graphics) {
      setDashboardGraphics(experiment.dashboard_graphics);
    }
  }, [experiment]);

  const addFactor = () => {
    setFactors([...factors, { name: "", levels: [""] }]);
  };

  const updateFactorName = (index, name) => {
    const newFactors = [...factors];
    newFactors[index].name = name;
    setFactors(newFactors);
  };

  const updateLevel = (factorIndex, levelIndex, value) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels[levelIndex] = value;
    setFactors(newFactors);
  };

  const addLevel = (factorIndex) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels.push("");
    setFactors(newFactors);
  };

  const removeLevel = (factorIndex, levelIndex) => {
    const newFactors = [...factors];
    if (newFactors[factorIndex].levels.length > 1) {
      newFactors[factorIndex].levels.splice(levelIndex, 1);
      setFactors(newFactors);
    }
  };

  const saveFactors = async () => {
    await base44.entities.Experiment.update(experimentId, { factors });
    alert('Factors saved!');
  };

  const startEditLevel = (factorIndex, levelIndex) => {
    setEditingLevel({ factorIndex, levelIndex });
    setEditingLevelValue(factors[factorIndex].levels[levelIndex]);
  };

  const saveEditLevel = () => {
    if (editingLevel && editingLevelValue.trim()) {
      const newFactors = [...factors];
      newFactors[editingLevel.factorIndex].levels[editingLevel.levelIndex] = editingLevelValue.trim();
      setFactors(newFactors);
      setEditingLevel(null);
      setEditingLevelValue('');
    }
  };

  const cancelEditLevel = () => {
    setEditingLevel(null);
    setEditingLevelValue('');
  };

  const saveCodeSettings = async () => {
    await base44.entities.Experiment.update(experimentId, {
      code_generation_mode: codeMode,
      code_prefix: codePrefix,
      code_starting_number: codeStartingNumber
    });
    alert('Code generation settings saved!');
  };

  const addCustomTrait = () => {
    setCustomTraits([...customTraits, { 
      name: "", 
      type: "text", 
      tab: "standalone", 
      modality: "all", 
      selection_mode: "checkbox", 
      color: "gray",
      filters: {
        alive_status: "alive",
        infection_status: "all",
        red_status: "all",
        sex: "all"
      }
    }]);
  };

  const updateTraitName = (index, name) => {
    const newTraits = [...customTraits];
    newTraits[index].name = name;
    setCustomTraits(newTraits);
  };

  const updateTraitType = (index, type) => {
    const newTraits = [...customTraits];
    newTraits[index].type = type;
    setCustomTraits(newTraits);
  };

  const updateTraitTab = (index, tab) => {
    const newTraits = [...customTraits];
    newTraits[index].tab = tab;
    if (tab !== 'infection') {
      newTraits[index].modality = 'all';
    }
    setCustomTraits(newTraits);
  };

  const updateTraitModality = (index, modality) => {
    const newTraits = [...customTraits];
    newTraits[index].modality = modality;
    setCustomTraits(newTraits);
  };

  const updateTraitSelectionMode = (index, mode) => {
    const newTraits = [...customTraits];
    newTraits[index].selection_mode = mode;
    setCustomTraits(newTraits);
  };

  const updateTraitColor = (index, color) => {
    const newTraits = [...customTraits];
    newTraits[index].color = color;
    setCustomTraits(newTraits);
  };

  const updateTraitFilter = (index, filterKey, value) => {
    const newTraits = [...customTraits];
    if (!newTraits[index].filters) {
      newTraits[index].filters = {
        alive_status: "alive",
        infection_status: "all",
        red_status: "all",
        sex: "all"
      };
    }
    newTraits[index].filters[filterKey] = value;
    setCustomTraits(newTraits);
  };

  const removeTrait = (index) => {
    const newTraits = [...customTraits];
    newTraits.splice(index, 1);
    setCustomTraits(newTraits);
  };

  const saveCustomTraits = async () => {
    const filteredTraits = customTraits.filter(t => t.name.trim());
    await base44.entities.Experiment.update(experimentId, { custom_traits: filteredTraits });
    queryClient.invalidateQueries(['experiment', experimentId]);
    alert('Custom traits saved!');
  };

  const addDashboardGraphic = () => {
    setDashboardGraphics([...dashboardGraphics, {
      name: "",
      trait: "survival",
      chart_type: "bar",
      selected_factors: [],
      facet_factor: null,
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

  const removeGraphic = (index) => {
    const newGraphics = [...dashboardGraphics];
    newGraphics.splice(index, 1);
    setDashboardGraphics(newGraphics);
  };

  const saveDashboardGraphics = async () => {
    const filteredGraphics = dashboardGraphics.filter(g => g.name.trim());
    await base44.entities.Experiment.update(experimentId, { dashboard_graphics: filteredGraphics });
    queryClient.invalidateQueries(['experiment', experimentId]);
    alert('Dashboard graphics saved!');
  };

  const deleteCustomTraitMutation = useMutation({
    mutationFn: async (traitName) => {
      if (!window.confirm(`Are you sure you want to delete the custom trait "${traitName}"? This will remove the trait definition and all associated data from individuals.`)) {
        throw new Error('Delete cancelled');
      }

      const updatedTraits = customTraits.filter(t => t.name !== traitName);
      await base44.entities.Experiment.update(experimentId, { custom_traits: updatedTraits });

      const individuals = await base44.entities.Individual.filter({ experiment_id: experimentId });
      for (const ind of individuals) {
        if (ind.custom_data && ind.custom_data[traitName] !== undefined) {
          const newCustomData = { ...ind.custom_data };
          delete newCustomData[traitName];
          await base44.entities.Individual.update(ind.id, { custom_data: newCustomData });
        }
      }

      return traitName;
    },
    onSuccess: (traitName) => {
      queryClient.invalidateQueries(['experiment', experimentId]);
      queryClient.invalidateQueries(['individuals']);
      alert(`Custom trait "${traitName}" deleted successfully`);
    },
    onError: (error) => {
      if (error.message !== 'Delete cancelled') {
        alert('Error: ' + error.message);
      }
    }
  });

  const renameExperimentMutation = useMutation({
    mutationFn: async (name) => {
      await base44.entities.Experiment.update(experimentId, {
        experiment_name: name
      });
      return name;
    },
    onSuccess: async (name) => {
      queryClient.invalidateQueries(['experiment', experimentId]);
      setIsEditingName(false);
      alert('Experiment renamed!');
    },
  });

  const deleteExperimentMutation = useMutation({
    mutationFn: async () => {
      const individuals = await base44.entities.Individual.filter({ experiment_id: experimentId });
      for (const ind of individuals) {
        const events = await base44.entities.ReproductionEvent.filter({ individual_id: ind.individual_id });
        for (const event of events) {
          await base44.entities.ReproductionEvent.delete(event.id);
        }
        await base44.entities.Individual.delete(ind.id);
      }
      const notes = await base44.entities.LabNote.filter({ experiment_id: experimentId });
      for (const note of notes) {
        await base44.entities.LabNote.delete(note.id);
      }
      await base44.entities.Experiment.delete(experimentId);
    },
    onSuccess: () => {
      exitExperiment();
      navigate(createPageUrl("Home"));
    },
    onError: (error) => {
      alert('Error deleting experiment: ' + error.message);
    },
  });

  const handleDeleteExperiment = () => {
    if (window.confirm('Are you sure you want to delete this experiment? This will delete all individuals, reproduction events, and lab notes associated with it. This action cannot be undone.')) {
      deleteExperimentMutation.mutate();
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName !== experiment.experiment_name) {
      renameExperimentMutation.mutate(newName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const generateIndividualsMutation = useMutation({
    mutationFn: async (categories) => {
      const individuals = [];
      let counter = codeStartingNumber;

      for (const category of categories) {
        for (let i = 0; i < category.count; i++) {
          let code;
          
          if (codeMode === 'numeric_id') {
            code = `${codePrefix}${counter}`;
          } else {
            const codeParts = Object.values(category.combination);
            code = `${codeParts.join('-')}-${String(counter).padStart(3, '0')}`;
          }
          
          individuals.push({
            individual_id: code,
            experiment_id: experimentId,
            factors: category.combination,
            alive: true,
            infected: false,
            red_signal_count: 0,
            red_confirmed: false,
            cumulative_offspring: 0,
            special_category: category.isSpecial ? category.specialName : null
          });
          counter++;
        }
      }

      await base44.entities.Individual.bulkCreate(individuals);
      await base44.entities.Experiment.update(experimentId, { 
        individuals_generated: true 
      });
      
      return { count: individuals.length, individuals };
    },
    onSuccess: async ({ count, individuals }) => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      
      const ids = individuals.map(ind => ind.individual_id);
      const idsText = ids.length > 10 
        ? `${ids.slice(0, 5).join(', ')}, ... ${ids.slice(-5).join(', ')}`
        : ids.join(', ');
      
      await base44.entities.LabNote.create({
        experiment_id: experimentId,
        note: `Generated ${count} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString(),
      });
      
      alert(`Generated ${count} individuals!`);
    },
  });

  if (!experiment) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('setup.title')}</h1>
        <p className="text-gray-600">{t('setup.description')}</p>
      </div>
      <div className="flex items-center justify-between mb-8">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-2xl font-bold h-12"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
            />
            <Button onClick={handleRename}>{t('common.save')}</Button>
            <Button variant="outline" onClick={() => setIsEditingName(false)}>{t('common.cancel')}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-700">{experiment.experiment_name}</span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsEditingName(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        <Button 
          variant="destructive" 
          onClick={handleDeleteExperiment}
          disabled={deleteExperimentMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteExperimentMutation.isPending ? t('setup.deleting') : t('setup.delete')}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dashboard Graphics Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure custom interactive visualizations for the dashboard. Select traits to visualize, grouping factors, chart types, and filtering options.
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
                    {customTraits.filter(t => t.name).map(t => (
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
              </div>

              <div className="border-t pt-3">
                <label className="text-sm font-semibold block mb-2">Select Factors for Grouping:</label>
                <div className="flex flex-wrap gap-3">
                  {factors.filter(f => f.name).map(factor => (
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
                  {factors.filter(f => f.name).map(factor => (
                    <option key={factor.name} value={factor.name}>
                      {factor.name}
                    </option>
                  ))}
                </select>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Custom Traits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Define additional traits to track for individuals (e.g., Cauliflower presence). These won't affect existing data.
          </p>
          {customTraits.map((trait, index) => (
            <div key={index} className="border p-4 rounded space-y-3">
              <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium">Trait Name</label>
                  <Input
                    value={trait.name}
                    onChange={(e) => updateTraitName(index, e.target.value)}
                    placeholder="e.g., Cauliflower"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="w-full border rounded p-2"
                    value={trait.type}
                    onChange={(e) => updateTraitType(index, e.target.value)}
                  >
                    <option value="boolean">Yes/No</option>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium">Tab</label>
                  <select
                    className="w-full border rounded p-2"
                    value={trait.tab || "standalone"}
                    onChange={(e) => updateTraitTab(index, e.target.value)}
                  >
                    <option value="standalone">New Standalone Tab</option>
                    <option value="infection">Infection Entry</option>
                    <option value="reproduction">Reproduction Entry</option>
                    <option value="death">Death Entry</option>
                    <option value="redness">Redness Entry</option>
                    {customTraits
                      .filter((t, i) => t.tab === 'standalone' && t.name && i !== index)
                      .map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} (custom trait)
                        </option>
                      ))}
                  </select>
                </div>
                {trait.tab === 'infection' && (
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium">Modality</label>
                    <select
                      className="w-full border rounded p-2"
                      value={trait.modality || "all"}
                      onChange={(e) => updateTraitModality(index, e.target.value)}
                    >
                      <option value="all">All Individuals</option>
                      <option value="infected">Infected Only</option>
                      <option value="non_infected">Non-Infected Only</option>
                    </select>
                  </div>
                )}
                {(trait.tab === 'standalone' || customTraits.some(t => t.name === trait.tab)) && (
                  <>
                    {trait.tab === 'standalone' && (
                      <div className="flex-1 min-w-[150px]">
                        <label className="text-sm font-medium">Selection Mode</label>
                        <select
                          className="w-full border rounded p-2"
                          value={trait.selection_mode || "checkbox"}
                          onChange={(e) => updateTraitSelectionMode(index, e.target.value)}
                        >
                          <option value="checkbox">Checkbox List</option>
                          <option value="id_list">Enter IDs</option>
                        </select>
                      </div>
                    )}
                    <div className="flex-1 min-w-[150px]">
                      <label className="text-sm font-medium">Tab Color</label>
                      <select
                        className="w-full border rounded p-2"
                        value={trait.color || "gray"}
                        onChange={(e) => updateTraitColor(index, e.target.value)}
                      >
                        <option value="gray">Gray</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="yellow">Yellow</option>
                        <option value="purple">Purple</option>
                        <option value="pink">Pink</option>
                        <option value="orange">Orange</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              {(trait.tab === 'standalone' || customTraits.some(t => t.name === trait.tab)) && trait.selection_mode === 'checkbox' && (
                <div className="border-t pt-3 mt-3">
                  <label className="text-sm font-semibold block mb-2">Filter Individuals:</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Alive Status</label>
                      <select
                        className="w-full border rounded p-1 text-sm"
                        value={trait.filters?.alive_status || "alive"}
                        onChange={(e) => updateTraitFilter(index, "alive_status", e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="alive">Alive Only</option>
                        <option value="dead">Dead Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Infection Status</label>
                      <select
                        className="w-full border rounded p-1 text-sm"
                        value={trait.filters?.infection_status || "all"}
                        onChange={(e) => updateTraitFilter(index, "infection_status", e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="infected">Infected Only</option>
                        <option value="non_infected">Non-Infected</option>
                        <option value="not_tested">Not Tested</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Red Status</label>
                      <select
                        className="w-full border rounded p-1 text-sm"
                        value={trait.filters?.red_status || "all"}
                        onChange={(e) => updateTraitFilter(index, "red_status", e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="red_confirmed">Red Confirmed</option>
                        <option value="not_red">Not Red</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Sex</label>
                      <select
                        className="w-full border rounded p-1 text-sm"
                        value={trait.filters?.sex || "all"}
                        onChange={(e) => updateTraitFilter(index, "sex", e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="male">Male Only</option>
                        <option value="female">Female Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 mt-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTrait(index)}
                    title="Remove from form"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {experiment?.custom_traits?.find(t => t.name === trait.name) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCustomTraitMutation.mutate(trait.name)}
                      disabled={deleteCustomTraitMutation.isPending}
                      title="Delete trait and all data"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addCustomTrait}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Trait
            </Button>
            <Button onClick={saveCustomTraits}>Save Custom Traits</Button>
          </div>
        </CardContent>
      </Card>

      {!experiment.individuals_generated ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('setup.codeGenMode')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">{t('setup.mode')}</label>
                <select 
                  className="w-full border rounded p-2"
                  value={codeMode}
                  onChange={(e) => setCodeMode(e.target.value)}
                >
                  <option value="factor_based">{t('setup.factorBasedExample')}</option>
                  <option value="numeric_id">{t('setup.simpleNumericId')}</option>
                </select>
              </div>

              {codeMode === 'numeric_id' && (
                <>
                  <div>
                    <label className="text-sm font-medium">{t('setup.prefix')}</label>
                    <Input
                      value={codePrefix}
                      onChange={(e) => setCodePrefix(e.target.value)}
                      placeholder="ID-"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('setup.startNumber')}</label>
                    <Input
                      type="number"
                      value={codeStartingNumber}
                      onChange={(e) => setCodeStartingNumber(parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                </>
              )}

              <Button onClick={saveCodeSettings}>{t('setup.saveCodeSettings')}</Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('setup.defineFactors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {factors.map((factor, fIndex) => (
                <div key={fIndex} className="border p-4 rounded space-y-3">
                  <div>
                    <label className="text-sm font-medium">{t('setup.factorName')}</label>
                    <Input
                      value={factor.name}
                      onChange={(e) => updateFactorName(fIndex, e.target.value)}
                      placeholder="e.g., Basket, Genotype"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('setup.levels')}</label>
                    {factor.levels.map((level, lIndex) => (
                      <div key={lIndex} className="flex gap-2 mb-2">
                        {editingLevel?.factorIndex === fIndex && editingLevel?.levelIndex === lIndex ? (
                          <>
                            <Input
                              value={editingLevelValue}
                              onChange={(e) => setEditingLevelValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditLevel();
                                if (e.key === 'Escape') cancelEditLevel();
                              }}
                              placeholder={`Level ${lIndex + 1}`}
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEditLevel}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEditLevel}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Input
                              value={level}
                              onChange={(e) => updateLevel(fIndex, lIndex, e.target.value)}
                              placeholder={`Level ${lIndex + 1}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditLevel(fIndex, lIndex)}
                              title="Edit level name"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {factor.levels.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLevel(fIndex, lIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addLevel(fIndex)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('setup.addLevel')}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={addFactor}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('setup.addFactor')}
                </Button>
                <Button onClick={saveFactors}>{t('common.save')} {t('setup.factors')}</Button>
              </div>
            </CardContent>
          </Card>

          {factors.length > 0 && (
            <MatrixLayout 
              factors={factors} 
              onGenerate={(categories) => generateIndividualsMutation.mutate(categories)}
            />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg mb-4">{t('setup.individualsGeneratedMsg')}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("DataEntry"))}>
                {t('setup.goToDataEntry')}
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dataset"))}>
                {t('setup.viewDataset')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}