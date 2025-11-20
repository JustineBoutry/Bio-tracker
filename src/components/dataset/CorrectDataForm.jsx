import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

export default function CorrectDataForm({ experimentId, experiment, individuals }) {
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState("");
  const [selectedIndividual, setSelectedIndividual] = useState(null);
  const [formData, setFormData] = useState(null);

  const handleSearch = () => {
    const found = individuals.find(ind => ind.individual_id === searchId.trim());
    if (found) {
      setSelectedIndividual(found);
      setFormData({
        individual_id: found.individual_id,
        factors: found.factors || {},
        alive: found.alive ?? true,
        death_date: found.death_date || "",
        first_reproduction_date: found.first_reproduction_date || "",
        last_reproduction_date: found.last_reproduction_date || "",
        cumulative_offspring: found.cumulative_offspring || 0,
        infected: found.infected ?? false,
        spores_count: found.spores_count || "",
        spores_volume: found.spores_volume || "",
        red_signal_count: found.red_signal_count || 0,
        red_confirmed: found.red_confirmed ?? false
      });
    } else {
      alert("Individual not found");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Individual.update(selectedIndividual.id, formData);
      return formData.individual_id;
    },
    onSuccess: async (individual_id) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: experimentId,
        note: `Corrected data for individual (ID: ${individual_id})`,
        timestamp: new Date().toISOString(),
      });
      
      alert("Data saved successfully!");
      setSelectedIndividual(null);
      setFormData(null);
      setSearchId("");
    },
    onError: (error) => {
      alert("Error saving data: " + error.message);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correct Individual Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter individual ID to correct"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {formData && (
          <div className="border rounded-lg p-6 space-y-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Editing: {selectedIndividual.individual_id}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedIndividual(null);
                  setFormData(null);
                  setSearchId("");
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Individual Code</label>
                <Input
                  value={formData.individual_id}
                  onChange={(e) => setFormData({ ...formData, individual_id: e.target.value })}
                />
              </div>

              {experiment?.factors && experiment.factors.map(factor => (
                <div key={factor.name}>
                  <label className="text-sm font-medium block mb-1">{factor.name}</label>
                  <select
                    className="w-full border rounded p-2"
                    value={formData.factors[factor.name] || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      factors: { ...formData.factors, [factor.name]: e.target.value }
                    })}
                  >
                    <option value="">-</option>
                    {factor.levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div>
                <label className="text-sm font-medium block mb-1">Alive</label>
                <div className="flex items-center h-10">
                  <Checkbox
                    checked={formData.alive}
                    onCheckedChange={(checked) => setFormData({ ...formData, alive: checked })}
                  />
                  <span className="ml-2">{formData.alive ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Death Date</label>
                <Input
                  type="date"
                  value={formData.death_date}
                  onChange={(e) => setFormData({ ...formData, death_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">First Reproduction Date</label>
                <Input
                  type="date"
                  value={formData.first_reproduction_date}
                  onChange={(e) => setFormData({ ...formData, first_reproduction_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Last Reproduction Date</label>
                <Input
                  type="date"
                  value={formData.last_reproduction_date}
                  onChange={(e) => setFormData({ ...formData, last_reproduction_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Cumulative Offspring</label>
                <Input
                  type="number"
                  value={formData.cumulative_offspring}
                  onChange={(e) => setFormData({ ...formData, cumulative_offspring: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Infected</label>
                <div className="flex items-center h-10">
                  <Checkbox
                    checked={formData.infected}
                    onCheckedChange={(checked) => setFormData({ ...formData, infected: checked })}
                  />
                  <span className="ml-2">{formData.infected ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Spores Count</label>
                <Input
                  type="number"
                  value={formData.spores_count}
                  onChange={(e) => setFormData({ ...formData, spores_count: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Spores Volume</label>
                <Input
                  value={formData.spores_volume}
                  onChange={(e) => setFormData({ ...formData, spores_volume: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Red Signal Count</label>
                <Input
                  type="number"
                  value={formData.red_signal_count}
                  onChange={(e) => setFormData({ ...formData, red_signal_count: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Red Confirmed</label>
                <div className="flex items-center h-10">
                  <Checkbox
                    checked={formData.red_confirmed}
                    onCheckedChange={(checked) => setFormData({ ...formData, red_confirmed: checked })}
                  />
                  <span className="ml-2">{formData.red_confirmed ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
              >
                {saveMutation.isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}