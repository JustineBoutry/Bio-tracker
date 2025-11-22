import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, CheckCircle, Edit2, X } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";
import { Input } from "@/components/ui/input";

export default function CleanupData() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const [duplicatesFound, setDuplicatesFound] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [highOffspringEvents, setHighOffspringEvents] = useState([]);
  const [scanningHighOffspring, setScanningHighOffspring] = useState(false);
  const [eventActions, setEventActions] = useState({});
  const [infectionPreview, setInfectionPreview] = useState(null);
  const [scanningInfection, setScanningInfection] = useState(false);

  const { data: experiment } = useQuery({
    queryKey: ['experiment', activeExperimentId],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: activeExperimentId });
      return exps[0];
    },
    enabled: !!activeExperimentId,
  });

  const scanForDuplicates = async () => {
    setScanning(true);
    setCleaned(false);
    try {
      const events = await base44.entities.ReproductionEvent.filter({ 
        experiment_id: activeExperimentId 
      });

      // Group by individual_id + event_date
      const grouped = {};
      events.forEach(event => {
        const key = `${event.individual_id}_${event.event_date}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(event);
      });

      // Find duplicates
      const duplicates = [];
      Object.entries(grouped).forEach(([key, eventList]) => {
        if (eventList.length > 1) {
          duplicates.push({
            individual_id: eventList[0].individual_id,
            event_date: eventList[0].event_date,
            count: eventList.length,
            events: eventList
          });
        }
      });

      setDuplicatesFound(duplicates);
    } catch (error) {
      alert('Error scanning: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  const scanForHighOffspring = async () => {
    setScanningHighOffspring(true);
    try {
      const events = await base44.entities.ReproductionEvent.filter({ 
        experiment_id: activeExperimentId 
      });

      const highEvents = events.filter(e => e.offspring_count > 15);
      setHighOffspringEvents(highEvents);
      
      // Initialize actions as "ignore" for all
      const actions = {};
      highEvents.forEach(e => {
        actions[e.id] = { action: 'ignore', newValue: e.offspring_count };
      });
      setEventActions(actions);
    } catch (error) {
      alert('Error scanning: ' + error.message);
    } finally {
      setScanningHighOffspring(false);
    }
  };

  const setEventAction = (eventId, action, newValue = null) => {
    setEventActions(prev => ({
      ...prev,
      [eventId]: { action, newValue: newValue ?? prev[eventId]?.newValue }
    }));
  };

  const scanInfectionStatus = async () => {
    setScanningInfection(true);
    setInfectionPreview(null);
    try {
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });
      const notes = await base44.entities.LabNote.filter({ 
        experiment_id: activeExperimentId 
      });

      // Parse notes to find infection entries
      const confirmedInfected = new Set();
      const confirmedNotInfected = new Set();

      notes.forEach(note => {
        const text = note.note.toLowerCase();
        if (text.includes('infection:')) {
          // Extract IDs from original note (not lowercased) to preserve case
          const match = note.note.match(/\(ids?:\s*([^)]+)\)/i);
          if (match) {
            const ids = match[1].split(/[\s,]+/).map(id => id.trim()).filter(Boolean);
            
            if (text.includes('marked infected') || text.includes('confirmed yes')) {
              ids.forEach(id => confirmedInfected.add(id));
            } else if (text.includes('non-infected') || text.includes('confirmed no')) {
              ids.forEach(id => confirmedNotInfected.add(id));
            }
          }
        }
      });

      const corrections = [];
      for (const ind of individuals) {
        const currentStatus = ind.infected || "not_tested";
        let suggestedStatus = null;
        let reason = '';

        // Check if in notebook
        const inInfectedNotebook = confirmedInfected.has(ind.individual_id);
        const inNotInfectedNotebook = confirmedNotInfected.has(ind.individual_id);

        // Determine correct status based on notebook
        if (inInfectedNotebook) {
          // Should be "confirmed Yes"
          if (currentStatus !== "confirmed Yes") {
            suggestedStatus = "confirmed Yes";
            reason = "Found in notebook as infected";
          }
        } else if (inNotInfectedNotebook) {
          // Should be "confirmed No"
          if (currentStatus !== "confirmed No") {
            suggestedStatus = "confirmed No";
            reason = "Found in notebook as non-infected";
          }
        } else {
          // Not in notebook - should be "not_tested"
          if (currentStatus !== "not_tested") {
            suggestedStatus = "not_tested";
            reason = "No infection record in notebook";
          }
        }

        if (suggestedStatus) {
          corrections.push({
            id: ind.id,
            individual_id: ind.individual_id,
            alive: ind.alive,
            current: currentStatus,
            suggested: suggestedStatus,
            reason
          });
        }
      }

      setInfectionPreview({ 
        total: individuals.length, 
        corrections,
        confirmedInfected: confirmedInfected.size,
        confirmedNotInfected: confirmedNotInfected.size
      });
    } catch (error) {
      alert('Scan failed: ' + error.message);
    } finally {
      setScanningInfection(false);
    }
  };

  const fixInfectionMutation = useMutation({
    mutationFn: async () => {
      for (const correction of infectionPreview.corrections) {
        await base44.entities.Individual.update(correction.id, {
          infected: correction.suggested
        });
      }
      return infectionPreview.corrections.length;
    },
    onSuccess: async (count) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        note: `Infection status cleanup: corrected ${count} individuals`,
        timestamp: new Date().toISOString(),
      });

      setInfectionPreview(null);
      alert(`Fixed ${count} individuals!`);
    },
  });

  const processHighOffspringMutation = useMutation({
    mutationFn: async () => {
      const affectedIndividuals = new Set();
      let edited = 0;
      let deleted = 0;

      for (const event of highOffspringEvents) {
        const action = eventActions[event.id];
        
        if (action.action === 'edit') {
          await base44.entities.ReproductionEvent.update(event.id, {
            offspring_count: action.newValue
          });
          affectedIndividuals.add(event.individual_id);
          edited++;
        } else if (action.action === 'delete') {
          await base44.entities.ReproductionEvent.delete(event.id);
          affectedIndividuals.add(event.individual_id);
          deleted++;
        }
      }

      // Recalculate cumulative_offspring for affected individuals
      for (const individual_id of affectedIndividuals) {
        const allEvents = await base44.entities.ReproductionEvent.filter({ individual_id });
        const total = allEvents.reduce((sum, e) => sum + (e.offspring_count || 0), 0);
        
        const sortedEvents = allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        const firstDate = sortedEvents.length > 0 ? sortedEvents[0].event_date : null;
        const lastDate = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].event_date : null;

        const individuals = await base44.entities.Individual.filter({ individual_id });
        if (individuals.length > 0) {
          await base44.entities.Individual.update(individuals[0].id, {
            cumulative_offspring: total,
            first_reproduction_date: firstDate,
            last_reproduction_date: lastDate
          });
        }
      }

      return { edited, deleted, individualsFixed: affectedIndividuals.size };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        note: `High offspring cleanup: edited ${result.edited} events, deleted ${result.deleted} events, recalculated ${result.individualsFixed} individuals`,
        timestamp: new Date().toISOString(),
      });

      setHighOffspringEvents([]);
      setEventActions({});
      alert(`Cleanup complete! Edited ${result.edited}, deleted ${result.deleted}, fixed ${result.individualsFixed} individuals.`);
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const affectedIndividuals = new Set();

      for (const duplicate of duplicatesFound) {
        // Keep the first event, delete the rest
        const toKeep = duplicate.events[0];
        const toDelete = duplicate.events.slice(1);

        for (const event of toDelete) {
          await base44.entities.ReproductionEvent.delete(event.id);
        }

        affectedIndividuals.add(duplicate.individual_id);
      }

      // Recalculate cumulative_offspring for affected individuals
      for (const individual_id of affectedIndividuals) {
        const allEvents = await base44.entities.ReproductionEvent.filter({ individual_id });
        const total = allEvents.reduce((sum, e) => sum + (e.offspring_count || 0), 0);
        
        const sortedEvents = allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        const firstDate = sortedEvents.length > 0 ? sortedEvents[0].event_date : null;
        const lastDate = sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1].event_date : null;

        const individuals = await base44.entities.Individual.filter({ individual_id });
        if (individuals.length > 0) {
          await base44.entities.Individual.update(individuals[0].id, {
            cumulative_offspring: total,
            first_reproduction_date: firstDate,
            last_reproduction_date: lastDate
          });
        }
      }

      return { 
        duplicatesRemoved: duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0),
        individualsFixed: affectedIndividuals.size 
      };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        note: `Data cleanup: removed ${result.duplicatesRemoved} duplicate reproduction events, recalculated offspring for ${result.individualsFixed} individuals`,
        timestamp: new Date().toISOString(),
      });

      setCleaned(true);
      setDuplicatesFound([]);
      alert(`Cleanup complete! Removed ${result.duplicatesRemoved} duplicates, fixed ${result.individualsFixed} individuals.`);
    },
  });

  if (!activeExperimentId) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No experiment selected</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Data Cleanup</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Scan for Duplicate Reproduction Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This tool will scan for duplicate reproduction events (same individual, same date) 
            and allow you to remove them while recalculating cumulative offspring counts.
          </p>
          <Button 
            onClick={scanForDuplicates}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Scan for Duplicates'}
          </Button>
        </CardContent>
      </Card>

      {cleaned && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">Data cleaned successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {duplicatesFound.length > 0 && !cleaned && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              Found {duplicatesFound.length} Duplicate Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-700">
              Total duplicate events to remove: {duplicatesFound.reduce((sum, d) => sum + (d.count - 1), 0)}
            </p>
            
            <div className="max-h-96 overflow-auto space-y-2">
              {duplicatesFound.map((dup, idx) => (
                <div key={idx} className="bg-white border border-yellow-200 rounded p-3">
                  <div className="font-mono font-semibold">{dup.individual_id}</div>
                  <div className="text-sm text-gray-600">
                    Date: {dup.event_date} • {dup.count} duplicate events
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {cleanupMutation.isPending ? 'Cleaning...' : 'Remove Duplicates & Fix Data'}
            </Button>
          </CardContent>
        </Card>
      )}

      {duplicatesFound.length === 0 && !scanning && !cleaned && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Scan for duplicates to see results</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 mt-8">
        <CardHeader>
          <CardTitle>Scan for High Offspring Events (&gt;15)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This tool will scan for reproduction events with more than 15 offspring. 
            You can choose to edit, delete, or ignore each event.
          </p>
          <Button 
            onClick={scanForHighOffspring}
            disabled={scanningHighOffspring}
          >
            {scanningHighOffspring ? 'Scanning...' : 'Scan for High Offspring'}
          </Button>
        </CardContent>
      </Card>

      {highOffspringEvents.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Found {highOffspringEvents.length} Events with &gt;15 Offspring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto space-y-2">
              {highOffspringEvents.map((event) => (
                <div key={event.id} className="bg-white border border-orange-200 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-mono font-semibold">{event.individual_id}</div>
                      <div className="text-sm text-gray-600">
                        Date: {event.event_date} • Offspring: {event.offspring_count}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded p-1 text-sm"
                        value={eventActions[event.id]?.action || 'ignore'}
                        onChange={(e) => setEventAction(event.id, e.target.value)}
                      >
                        <option value="ignore">Ignore</option>
                        <option value="edit">Edit</option>
                        <option value="delete">Delete</option>
                      </select>
                      
                      {eventActions[event.id]?.action === 'edit' && (
                        <Input
                          type="number"
                          min="0"
                          value={eventActions[event.id]?.newValue || 0}
                          onChange={(e) => setEventAction(event.id, 'edit', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => processHighOffspringMutation.mutate()}
              disabled={processHighOffspringMutation.isPending || 
                Object.values(eventActions).every(a => a.action === 'ignore')}
            >
              {processHighOffspringMutation.isPending ? 'Processing...' : 'Apply Changes'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 mt-8">
        <CardHeader>
          <CardTitle>Fix Infection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This tool scans for infection status errors by:
            <br />• Checking lab notebook for infection entries
            <br />• Marking alive individuals as "not_tested" unless confirmed in notebook
            <br />• Fixing old boolean values (true/false)
            <br />• Detecting status without corresponding notebook entries
          </p>
          <Button 
            onClick={scanInfectionStatus}
            disabled={scanningInfection}
          >
            {scanningInfection ? 'Scanning...' : 'Scan Infection Status'}
          </Button>
        </CardContent>
      </Card>

      {infectionPreview && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">
              Found {infectionPreview.corrections.length} Status Corrections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-blue-700">
              <p>Notebook entries found: {infectionPreview.confirmedInfected} infected, {infectionPreview.confirmedNotInfected} non-infected</p>
              <p>Total individuals: {infectionPreview.total}</p>
            </div>

            {infectionPreview.corrections.length > 0 && (
              <>
                <div className="max-h-96 overflow-auto space-y-2">
                  {infectionPreview.corrections.map((correction) => (
                    <div key={correction.id} className="bg-white border border-blue-200 rounded p-3">
                      <div className="font-mono font-semibold">{correction.individual_id}</div>
                      <div className="text-sm text-gray-600">
                        Status: {correction.alive ? 'Alive' : 'Dead'} | 
                        <span className="text-red-600"> {String(correction.current)}</span> → 
                        <span className="text-green-600"> {correction.suggested}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{correction.reason}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => fixInfectionMutation.mutate()}
                    disabled={fixInfectionMutation.isPending}
                  >
                    {fixInfectionMutation.isPending ? 'Fixing...' : 'Apply Corrections'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={scanInfectionStatus}
                    disabled={fixInfectionMutation.isPending || scanningInfection}
                  >
                    Re-scan
                  </Button>
                </div>
              </>
            )}

            {infectionPreview.corrections.length === 0 && (
              <div className="text-center py-4 text-green-700">
                ✓ No corrections needed!
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}