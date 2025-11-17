import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Experiments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    experiment_name: "",
    start_date: new Date().toISOString().split('T')[0],
    infection_date: ""
  });

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Experiment.create(data),
    onSuccess: (newExperiment) => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      setShowForm(false);
      setFormData({ experiment_name: "", start_date: new Date().toISOString().split('T')[0], infection_date: "" });
      navigate(createPageUrl("ExperimentSetup") + `?id=${newExperiment.id}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Experiments</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Experiment
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Experiment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Experiment Name</Label>
                <Input
                  value={formData.experiment_name}
                  onChange={(e) => setFormData({...formData, experiment_name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label>Infection Date</Label>
                  <Input
                    type="date"
                    value={formData.infection_date}
                    onChange={(e) => setFormData({...formData, infection_date: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experiments.map((exp) => (
          <Card 
            key={exp.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(createPageUrl("ExperimentSetup") + `?id=${exp.id}`)}
          >
            <CardHeader>
              <CardTitle>{exp.experiment_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Started: {exp.start_date}</p>
              {exp.infection_date && (
                <p className="text-sm text-gray-600">Infected: {exp.infection_date}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}