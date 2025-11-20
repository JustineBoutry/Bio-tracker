import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MatrixLayout from "../components/experiment/MatrixLayout";
import { useExperiment } from "../components/ExperimentContext";

export default function ExperimentSetup() {
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

  const saveCodeSettings = async () => {
    await base44.entities.Experiment.update(experimentId, {
      code_generation_mode: codeMode,
      code_prefix: codePrefix,
      code_starting_number: codeStartingNumber
    });
    alert('Code generation settings saved!');
  };

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
      alert('Experiment deleted!');
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
            <Button onClick={handleRename}>Save</Button>
            <Button variant="outline" onClick={() => setIsEditingName(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{experiment.experiment_name}</h1>
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
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Experiment
        </Button>
      </div>

      {!experiment.individuals_generated ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Code Generation Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Mode</label>
                <select 
                  className="w-full border rounded p-2"
                  value={codeMode}
                  onChange={(e) => setCodeMode(e.target.value)}
                >
                  <option value="factor_based">Factor-based (e.g., Basket-Genotype-001)</option>
                  <option value="numeric_id">Simple numeric ID</option>
                </select>
              </div>

              {codeMode === 'numeric_id' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Prefix</label>
                    <Input
                      value={codePrefix}
                      onChange={(e) => setCodePrefix(e.target.value)}
                      placeholder="ID-"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Starting Number</label>
                    <Input
                      type="number"
                      value={codeStartingNumber}
                      onChange={(e) => setCodeStartingNumber(parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                </>
              )}

              <Button onClick={saveCodeSettings}>Save Code Settings</Button>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>2. Define Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {factors.map((factor, fIndex) => (
                <div key={fIndex} className="border p-4 rounded space-y-3">
                  <div>
                    <label className="text-sm font-medium">Factor Name</label>
                    <Input
                      value={factor.name}
                      onChange={(e) => updateFactorName(fIndex, e.target.value)}
                      placeholder="e.g., Basket, Genotype"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Levels</label>
                    {factor.levels.map((level, lIndex) => (
                      <div key={lIndex} className="flex gap-2 mb-2">
                        <Input
                          value={level}
                          onChange={(e) => updateLevel(fIndex, lIndex, e.target.value)}
                          placeholder={`Level ${lIndex + 1}`}
                        />
                        {factor.levels.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLevel(fIndex, lIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addLevel(fIndex)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Level
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={addFactor}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Factor
                </Button>
                <Button onClick={saveFactors}>Save Factors</Button>
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
            <p className="text-lg mb-4">✓ Individuals generated</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("DataEntry"))}>
                Go to Data Entry
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dataset"))}>
                View Dataset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}