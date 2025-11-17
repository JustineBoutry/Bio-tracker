import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Check, ArrowLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ExperimentSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const experimentId = urlParams.get('id');

  const [factors, setFactors] = useState([{ name: "", levels: [""] }]);
  const [categories, setCategories] = useState([]);
  const [generatingIndividuals, setGeneratingIndividuals] = useState(false);

  const { data: experiment, isLoading } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: experimentId });
      return exps[0];
    },
    enabled: !!experimentId,
  });

  useEffect(() => {
    if (experiment?.factors && experiment.factors.length > 0) {
      setFactors(experiment.factors);
    }
    if (experiment?.categories && experiment.categories.length > 0) {
      setCategories(experiment.categories);
    }
  }, [experiment]);

  const saveFactorsMutation = useMutation({
    mutationFn: async (factorsData) => {
      await base44.entities.Experiment.update(experimentId, { factors: factorsData });
      return factorsData;
    },
    onSuccess: (factorsData) => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      generateCategories(factorsData);
    },
  });

  const generateIndividualsMutation = useMutation({
    mutationFn: async () => {
      setGeneratingIndividuals(true);
      
      const individuals = [];
      let individualCounter = 1;

      for (const category of categories) {
        const count = category.individual_count || 0;
        for (let i = 0; i < count; i++) {
          individuals.push({
            individual_id: `IND_${String(individualCounter).padStart(4, '0')}`,
            experiment_id: experimentId,
            factors: category.combination,
            alive: true,
            infected: false,
            red_signals_count: 0,
            red_confirmed: false,
            cumulative_offspring: 0
          });
          individualCounter++;
        }
      }

      await base44.entities.Individual.bulkCreate(individuals);
      await base44.entities.Experiment.update(experimentId, { 
        categories,
        individuals_generated: true 
      });
      
      return individuals.length;
    },
    onSuccess: (count) => {
      setGeneratingIndividuals(false);
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      alert(`Successfully generated ${count} individuals!`);
      navigate(createPageUrl("Dashboard") + `?id=${experimentId}`);
    },
  });

  const generateCategories = (factorsData) => {
    const combinations = [];
    
    const generateCombinations = (index, current) => {
      if (index === factorsData.length) {
        combinations.push({ ...current });
        return;
      }
      
      const factor = factorsData[index];
      for (const level of factor.levels) {
        generateCombinations(index + 1, { ...current, [factor.name]: level });
      }
    };
    
    generateCombinations(0, {});
    
    setCategories(combinations.map(combo => ({
      combination: combo,
      individual_count: 50
    })));
  };

  const addFactor = () => {
    setFactors([...factors, { name: "", levels: [""] }]);
  };

  const removeFactor = (index) => {
    setFactors(factors.filter((_, i) => i !== index));
  };

  const updateFactor = (index, field, value) => {
    const newFactors = [...factors];
    newFactors[index][field] = value;
    setFactors(newFactors);
  };

  const addLevel = (factorIndex) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels.push("");
    setFactors(newFactors);
  };

  const removeLevel = (factorIndex, levelIndex) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels = newFactors[factorIndex].levels.filter((_, i) => i !== levelIndex);
    setFactors(newFactors);
  };

  const updateLevel = (factorIndex, levelIndex, value) => {
    const newFactors = [...factors];
    newFactors[factorIndex].levels[levelIndex] = value;
    setFactors(newFactors);
  };

  const updateCategoryCount = (index, count) => {
    const newCategories = [...categories];
    newCategories[index].individual_count = parseInt(count) || 0;
    setCategories(newCategories);
  };

  const handleSaveFactors = () => {
    const validFactors = factors.filter(f => f.name && f.levels.some(l => l));
    saveFactorsMutation.mutate(validFactors);
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(createPageUrl("Experiments"))}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Experiment Setup</h1>
          <p className="text-slate-600 mt-1">{experiment?.experiment_name}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>1. Define Experimental Factors</span>
            {experiment?.individuals_generated && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Check className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {factors.map((factor, factorIndex) => (
            <div key={factorIndex} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Factor Name</Label>
                  <Input
                    value={factor.name}
                    onChange={(e) => updateFactor(factorIndex, 'name', e.target.value)}
                    placeholder="e.g., Basket, Genotype, Temperature"
                    disabled={experiment?.individuals_generated}
                  />
                </div>
                {!experiment?.individuals_generated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFactor(factorIndex)}
                    className="mt-6"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div>
                <Label>Levels</Label>
                <div className="space-y-2 mt-2">
                  {factor.levels.map((level, levelIndex) => (
                    <div key={levelIndex} className="flex items-center gap-2">
                      <Input
                        value={level}
                        onChange={(e) => updateLevel(factorIndex, levelIndex, e.target.value)}
                        placeholder={`Level ${levelIndex + 1}`}
                        disabled={experiment?.individuals_generated}
                      />
                      {!experiment?.individuals_generated && factor.levels.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLevel(factorIndex, levelIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!experiment?.individuals_generated && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addLevel(factorIndex)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Level
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {!experiment?.individuals_generated && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={addFactor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Factor
              </Button>
              <Button onClick={handleSaveFactors} className="bg-blue-600 hover:bg-blue-700">
                <Check className="w-4 h-4 mr-2" />
                Save Factors & Generate Categories
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>2. Set Individual Counts per Category</span>
              <Badge variant="outline">
                {categories.reduce((sum, c) => sum + (c.individual_count || 0), 0)} total individuals
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(category.combination).map(([factor, level]) => (
                        <Badge key={factor} variant="secondary">
                          {factor}: {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <Input
                      type="number"
                      value={category.individual_count}
                      onChange={(e) => updateCategoryCount(index, e.target.value)}
                      className="w-24"
                      min="0"
                      disabled={experiment?.individuals_generated}
                    />
                  </div>
                </div>
              ))}
            </div>

            {!experiment?.individuals_generated && (
              <Button
                onClick={() => generateIndividualsMutation.mutate()}
                disabled={generatingIndividuals}
                className="w-full mt-6 bg-green-600 hover:bg-green-700"
              >
                {generatingIndividuals ? "Generating..." : "Generate Individuals"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}