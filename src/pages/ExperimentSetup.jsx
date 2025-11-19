import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MatrixLayout from "../components/experiment/MatrixLayout";

export default function ExperimentSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const experimentId = urlParams.get('id');

  const [factors, setFactors] = useState([]);

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

  const generateIndividualsMutation = useMutation({
    mutationFn: async (categories) => {
      const individuals = [];
      let counter = 1;

      for (const category of categories) {
        for (let i = 0; i < category.count; i++) {
          const codeParts = Object.values(category.combination);
          const code = `${codeParts.join('-')}-${String(counter).padStart(3, '0')}`;
          
          individuals.push({
            individual_id: code,
            experiment_id: experimentId,
            factors: category.combination,
            alive: true,
            infected: false,
            red_signal_count: 0,
            red_confirmed: false,
            cumulative_offspring: 0
          });
          counter++;
        }
      }

      await base44.entities.Individual.bulkCreate(individuals);
      await base44.entities.Experiment.update(experimentId, { 
        individuals_generated: true 
      });
      
      return individuals.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['experiment', experimentId] });
      alert(`Generated ${count} individuals!`);
    },
  });

  if (!experiment) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Experiments"))}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">{experiment.experiment_name} - Setup</h1>
      </div>

      {!experiment.individuals_generated ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>1. Define Factors</CardTitle>
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