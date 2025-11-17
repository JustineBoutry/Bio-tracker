import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Settings, Calendar, Activity } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Experiments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    experiment_name: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    infection_date: "",
    description: ""
  });

  const { data: experiments, isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.list("-created_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Experiment.create(data),
    onSuccess: (newExperiment) => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      setShowCreateDialog(false);
      setFormData({ experiment_name: "", start_date: format(new Date(), "yyyy-MM-dd"), infection_date: "", description: "" });
      navigate(createPageUrl("ExperimentSetup") + `?id=${newExperiment.id}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Experiments</h1>
          <p className="text-slate-600 mt-2">Manage your biological experiments</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Experiment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((experiment) => {
          const dpi = experiment.infection_date 
            ? differenceInDays(new Date(), new Date(experiment.infection_date))
            : null;
          
          return (
            <Card 
              key={experiment.id}
              className="hover:shadow-xl transition-all duration-300 cursor-pointer border-slate-200 bg-white/80 backdrop-blur-sm"
              onClick={() => navigate(createPageUrl("Dashboard") + `?id=${experiment.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="text-lg font-bold text-slate-900">{experiment.experiment_name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(createPageUrl("ExperimentSetup") + `?id=${experiment.id}`);
                    }}
                    className="hover:bg-slate-100"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>Started: {format(new Date(experiment.start_date), "MMM d, yyyy")}</span>
                </div>
                
                {experiment.infection_date && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Activity className="w-4 h-4" />
                    <span>Infection: {format(new Date(experiment.infection_date), "MMM d, yyyy")}</span>
                  </div>
                )}

                {dpi !== null && (
                  <div className="mt-4 px-3 py-2 bg-blue-50 rounded-lg">
                    <span className="text-sm font-semibold text-blue-700">
                      Day {dpi} post-infection
                    </span>
                  </div>
                )}

                {experiment.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mt-3">
                    {experiment.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Experiment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="experiment_name">Experiment Name*</Label>
              <Input
                id="experiment_name"
                value={formData.experiment_name}
                onChange={(e) => setFormData({...formData, experiment_name: e.target.value})}
                required
                placeholder="e.g., Temperature Stress 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date*</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="infection_date">Infection Date</Label>
                <Input
                  id="infection_date"
                  type="date"
                  value={formData.infection_date}
                  onChange={(e) => setFormData({...formData, infection_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Optional experiment description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create & Setup
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}