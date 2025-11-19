import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Experiments() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const createExperiment = async () => {
    if (!name) return;
    const exp = await base44.entities.Experiment.create({
      experiment_name: name,
      start_date: startDate,
      individuals_generated: false
    });
    navigate(createPageUrl("ExperimentSetup") + `?id=${exp.id}`);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Experiments</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Experiment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Experiment Name</label>
            <Input
              placeholder="Enter experiment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <Button onClick={createExperiment}>Create & Setup</Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">All Experiments</h2>
        {experiments.map((exp) => (
          <Card key={exp.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{exp.experiment_name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Started: {exp.start_date}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(createPageUrl("ExperimentSetup") + `?id=${exp.id}`)}
                  >
                    Setup
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate(createPageUrl("Dashboard") + `?id=${exp.id}`)}
                  >
                    Dashboard
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}