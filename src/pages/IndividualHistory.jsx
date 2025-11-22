import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Baby, Skull, Droplet, Syringe, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useExperiment } from "../components/ExperimentContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function IndividualHistory() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const selectedExp = activeExperimentId;
  const [individualId, setIndividualId] = useState('');
  const [selectedIndividual, setSelectedIndividual] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingValue, setEditingValue] = useState(0);

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExp }),
    enabled: !!selectedExp,
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

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, newCount }) => {
      await base44.entities.ReproductionEvent.update(eventId, {
        offspring_count: newCount
      });

      // Recalculate cumulative offspring for this individual
      const allEvents = await base44.entities.ReproductionEvent.filter({ 
        individual_id: selectedIndividual.individual_id 
      });
      const total = allEvents.map(e => 
        e.id === eventId ? newCount : e.offspring_count
      ).reduce((sum, count) => sum + (count || 0), 0);

      await base44.entities.Individual.update(selectedIndividual.id, {
        cumulative_offspring: total
      });

      return { eventId, newCount, total };
    },
    onSuccess: async ({ newCount, total }) => {
      queryClient.invalidateQueries(['reproduction-events']);
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Edited reproduction event for ${selectedIndividual.individual_id}, new total: ${total} offspring`,
        timestamp: new Date().toISOString(),
      });

      setEditingEventId(null);
      alert('Event updated!');
    },
  });

  const startEdit = (event) => {
    setEditingEventId(event.id);
    setEditingValue(event.offspring_count);
  };

  const saveEdit = (eventId) => {
    updateEventMutation.mutate({ eventId, newCount: editingValue });
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditingValue(0);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Individual Life History</h1>
      
      {selectedExp && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Individual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={individualId}
                  onChange={(e) => setIndividualId(e.target.value)}
                  placeholder="Enter individual code"
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Factors</p>
                  <div className="space-y-1">
                    {selectedIndividual.factors && Object.entries(selectedIndividual.factors).map(([k, v]) => (
                      <Badge key={k} variant="secondary">{k}: {v}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge variant={selectedIndividual.alive ? "default" : "secondary"}>
                    {selectedIndividual.alive ? "Alive" : "Dead"}
                  </Badge>
                  {selectedIndividual.death_date && (
                    <p className="text-sm mt-1">Died: {selectedIndividual.death_date}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Infected</p>
                  <Badge variant={selectedIndividual.infected ? "destructive" : "outline"}>
                    {selectedIndividual.infected ? "Yes" : "No"}
                  </Badge>
                  {selectedIndividual.infected && (
                    <div className="text-sm mt-1">
                      <div>Spores: {selectedIndividual.spores_count}</div>
                      <div>Volume: {selectedIndividual.spores_volume}</div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Red Status</p>
                  <div>
                    <Badge variant={selectedIndividual.red_confirmed ? "destructive" : "outline"}>
                      {selectedIndividual.red_confirmed ? 'Confirmed' : 'Not Confirmed'}
                    </Badge>
                    <p className="text-sm mt-1">Signals: {selectedIndividual.red_signal_count || 0}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Offspring</p>
                  <p className="text-2xl font-bold">{selectedIndividual.cumulative_offspring || 0}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Reproduction Period</p>
                  {selectedIndividual.first_reproduction_date ? (
                    <div className="text-sm">
                      <div>First: {selectedIndividual.first_reproduction_date}</div>
                      <div>Last: {selectedIndividual.last_reproduction_date}</div>
                    </div>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cumulative Offspring Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {reproductionEvents.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={
                    reproductionEvents
                      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                      .reduce((acc, event) => {
                        const cumulative = acc.length > 0 
                          ? acc[acc.length - 1].cumulative + event.offspring_count
                          : event.offspring_count;
                        acc.push({
                          date: event.event_date,
                          cumulative: cumulative
                        });
                        return acc;
                      }, [])
                  }>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value) => [value, 'Offspring']}
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="cumulative" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-600">No reproduction events recorded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reproduction Events</CardTitle>
            </CardHeader>
            <CardContent>
              {reproductionEvents.length > 0 ? (
                <div className="space-y-3">
                  {reproductionEvents.sort((a, b) => 
                    new Date(b.event_date) - new Date(a.event_date)
                  ).map((event, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 border rounded">
                      <Baby className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-semibold">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                        {editingEventId === event.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              min="0"
                              value={editingValue}
                              onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
                              className="w-24"
                              autoFocus
                            />
                            <span className="text-sm text-gray-600">offspring</span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">{event.offspring_count} offspring</p>
                        )}
                      </div>
                      {editingEventId === event.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveEdit(event.id)}
                            disabled={updateEventMutation.isPending}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={updateEventMutation.isPending}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(event)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No reproduction events recorded</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {selectedExp && !selectedIndividual && individualId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">No individual found with code: {individualId}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}