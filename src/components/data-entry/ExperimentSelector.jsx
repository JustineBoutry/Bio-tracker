import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical } from "lucide-react";

export default function ExperimentSelector({ experiments, selectedExperiment, onSelect }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlaskConical className="w-5 h-5" />
          Select Experiment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={selectedExperiment || ""} onValueChange={onSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an experiment..." />
          </SelectTrigger>
          <SelectContent>
            {experiments.map((exp) => (
              <SelectItem key={exp.id} value={exp.id}>
                {exp.experiment_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}