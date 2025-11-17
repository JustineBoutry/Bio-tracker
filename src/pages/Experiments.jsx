import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Experiments() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Experiment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['experiments']);
      setName("");
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Experiments</h1>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Experiment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={() => createMutation.mutate({ 
              experiment_name: name,
              start_date: new Date().toISOString().split('T')[0]
            })}>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {experiments.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <CardTitle>{exp.experiment_name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}