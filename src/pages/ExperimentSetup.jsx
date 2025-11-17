import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ExperimentSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const experimentId = urlParams.get('id');

  const [factors, setFactors] = useState([{ name: "Basket", levels: ["B1", "B2"] }]);
  const [individualCount, setIndividualCount] = useState(50);

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
  }, [experiment]);

  const generateIndividualsMutation = useMutation({
    mutationFn: async () => {
      const individuals = [];
      let counter = 1;

      const generateCombinations = (index, current) => {
        if (index === factors.length) {
          for (let i = 0; i < individualCount; i++) {
            individuals.push({
              individual_id: `IND_${String(counter).padStart(4, '0')}`,
              experiment_id: experimentId,
              factors: { ...current },
              alive: true,
              infected: false,
              red_signals_count: 0,
              red_confirmed: false,
              cumulative_offspring: 0
            });
            counter++;
          }
          return;
        }
        
        const factor = factors[index];
        for (const level of factor.levels) {
          generateCombinations(index + 1, { ...current, [factor.name]: level });
        }
      };

      generateCombinations(0, {});

      await base44.entities.Individual.bulkCreate(individuals);
      await base44.entities.Experiment.update(experimentId, { 
        factors,
        individuals_generated: true 
      });
      
      return individuals.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      alert(`Generated ${count} individuals!`);
      navigate(createPageUrl("DataEntry"));
    },
  });

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

  if (!experiment) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Experiments"))}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Setup: {experiment.experiment_name}</h1>
        </div>
      </div>

      {!experiment.individuals_generated ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Define Factors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {factors.map((factor, fIndex) => (
                <div key={fIndex} className="border p-4 rounded space-y-3">
                  <div>
                    <Label>Factor Name</Label>
                    <Input
                      value={factor.name}
                      onChange={(e) => updateFactorName(fIndex, e.target.value)}
                      placeholder="e.g., Basket, Genotype"
                    />
                  </div>
                  <div>
                    <Label>Levels</Label>
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
              <Button variant="outline" onClick={addFactor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Factor
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Individuals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Individuals per category</Label>
                <Input
                  type="number"
                  value={individualCount}
                  onChange={(e) => setIndividualCount(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <Button 
                onClick={() => generateIndividualsMutation.mutate()}
                className="w-full"
              >
                Generate Individuals
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg mb-4">✓ Individuals generated</p>
            <Button onClick={() => navigate(createPageUrl("DataEntry"))}>
              Go to Data Entry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}