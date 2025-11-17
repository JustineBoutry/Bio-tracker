import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Baby, Skull, Droplet, Syringe } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function IndividualHistory() {
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [individualId, setIndividualId] = useState('');
  const [selectedIndividual, setSelectedIndividual] = useState(null);

  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => base44.entities.Experiment.filter({ individuals_generated: true }),
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExperiment],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExperiment }),
    enabled: !!selectedExperiment,
  });

  const { data: reproductionEvents = [] } = useQuery({
    queryKey: ['reproduction-events', selectedIndividual?.individual_id],
    queryFn: () => base44.entities.ReproductionEvent.filter({ 
      individual_id: selectedIndividual.individual_id 
    }),
    enabled: !!selectedIndividual,
  });

  const handleSearch = () => {
    const found = individuals.find(i => i.individual_id === individualId);
    setSelectedIndividual(found || null);
  };

  const getTimeline = () => {
    const timeline = [];

    if (selectedIndividual?.first_reproduction_date) {
      timeline.push({
        type: 'reproduction_start',
        date: selectedIndividual.first_reproduction_date,
        icon: Baby,
        color: 'text-green-600',
        title: 'First Reproduction',
        description: 'Individual started reproducing'
      });
    }

    reproductionEvents.forEach(event => {
      timeline.push({
        type: 'reproduction',
        date: event.event_date,
        icon: Baby,
        color: 'text-green-600',
        title: 'Reproduction Event',
        description: `Produced ${event.offspring_count} offspring`
      });
    });

    if (selectedIndividual?.red_signals_count > 0) {
      timeline.push({
        type: 'redness',
        date: new Date().toISOString(),
        icon: Droplet,
        color: 'text-red-600',
        title: 'Redness Signals',
        description: `${selectedIndividual.red_signals_count} signals${selectedIndividual.red_confirmed ? ' - CONFIRMED' : ''}`
      });
    }

    if (selectedIndividual?.infected) {
      timeline.push({
        type: 'infection',
        date: new Date().toISOString(),
        icon: Syringe,
        color: 'text-purple-600',
        title: 'Infection Detected',
        description: selectedIndividual.spores_count 
          ? `Spores: ${selectedIndividual.spores_count} (${selectedIndividual.spores_volume})`
          : 'Infected status confirmed'
      });
    }

    if (selectedIndividual?.death_date) {
      timeline.push({
        type: 'death',
        date: selectedIndividual.death_date,
        icon: Skull,
        color: 'text-slate-600',
        title: 'Death',
        description: 'Individual deceased'
      });
    }

    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Individual History</h1>
        <p className="text-slate-600">View life history and events for any individual</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Experiment</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedExperiment || ""} onValueChange={setSelectedExperiment}>
            <SelectTrigger>
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

      {selectedExperiment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Individual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={individualId}
                  onChange={(e) => setIndividualId(e.target.value)}
                  placeholder="Enter individual ID (e.g., IND_0001)"
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedIndividual && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Individual Summary</span>
                <span className="font-mono text-lg">{selectedIndividual.individual_id}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Factors</p>
                  <div className="space-y-1">
                    {Object.entries(selectedIndividual.factors).map(([k, v]) => (
                      <Badge key={k} variant="secondary">
                        {k}: {v}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  <Badge variant={selectedIndividual.alive ? "default" : "secondary"} className="text-sm">
                    {selectedIndividual.alive ? "Alive" : "Dead"}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Infected</p>
                  <Badge variant={selectedIndividual.infected ? "destructive" : "outline"} className="text-sm">
                    {selectedIndividual.infected ? "Yes" : "No"}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Red Status</p>
                  {selectedIndividual.red_confirmed ? (
                    <Badge className="bg-red-100 text-red-800">Confirmed</Badge>
                  ) : selectedIndividual.red_signals_count > 0 ? (
                    <Badge variant="outline">{selectedIndividual.red_signals_count} signals</Badge>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Offspring</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {selectedIndividual.cumulative_offspring || 0}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">First Reproduction</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {selectedIndividual.first_reproduction_date 
                      ? format(new Date(selectedIndividual.first_reproduction_date), "MMM d, yyyy")
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-1">Last Reproduction</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {selectedIndividual.last_reproduction_date 
                      ? format(new Date(selectedIndividual.last_reproduction_date), "MMM d, yyyy")
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedIndividual.spores_count && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-slate-500 mb-1">Spore Count</p>
                  <p className="text-lg font-semibold">
                    {selectedIndividual.spores_count} 
                    {selectedIndividual.spores_volume && ` (${selectedIndividual.spores_volume})`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Life Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getTimeline().map((event, index) => {
                  const Icon = event.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center ${event.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {index < getTimeline().length - 1 && (
                          <div className="w-0.5 h-12 bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">{event.title}</h4>
                          <span className="text-sm text-slate-500">
                            {format(new Date(event.date), "MMM d, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedExperiment && !selectedIndividual && individualId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No individual found with ID: {individualId}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}