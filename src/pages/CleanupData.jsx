import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, CheckCircle } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";

export default function CleanupData() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const [duplicatesFound, setDuplicatesFound] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [cleaned, setCleaned] = useState(false);

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
      Object.entries(grouped).forEach(([key, events]) => {
        if (events.length > 1) {
          duplicates.push({
            individual_id: events[0].individual_id,
            event_date: events[0].event_date,
            count: events.length,
            events: events
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
    </div>
  );
}