import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExperiment } from "../components/ExperimentContext";

export default function MigrateInfectionData() {
  const { activeExperimentId } = useExperiment();
  const [migrating, setMigrating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const scanData = async () => {
    setScanning(true);
    setResult(null);
    try {
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });

      const changes = [];
      for (const ind of individuals) {
        let newStatus = null;
        
        if (ind.infected === true || ind.infected === "true") {
          newStatus = "confirmed Yes";
        } else if (ind.infected === false || ind.infected === "false") {
          newStatus = "confirmed No";
        }

        if (newStatus) {
          changes.push({
            id: ind.id,
            individual_id: ind.individual_id,
            current: ind.infected,
            new: newStatus
          });
        }
      }

      setPreview({ total: individuals.length, changes });
    } catch (error) {
      alert('Scan failed: ' + error.message);
    } finally {
      setScanning(false);
    }
  };

  const migrateData = async () => {
    setMigrating(true);
    try {
      for (const change of preview.changes) {
        await base44.entities.Individual.update(change.id, {
          infected: change.new
        });
      }

      setResult({ total: preview.total, updated: preview.changes.length });
      setPreview(null);
      alert(`Migration complete! Updated ${preview.changes.length} of ${preview.total} individuals.`);
    } catch (error) {
      alert('Migration failed: ' + error.message);
    } finally {
      setMigrating(false);
    }
  };

  if (!activeExperimentId) {
    return (
      <div className="p-8">
        <p className="text-gray-600">No experiment selected</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Migrate Infection Data</h1>

      <Card>
        <CardHeader>
          <CardTitle>Convert Infection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This tool will convert old infection status values (true/false) to the new format:
            <br />• true → "confirmed Yes"
            <br />• false → "confirmed No"
            <br />• null/undefined → "not_tested"
          </p>
          
          <Button 
            onClick={scanData}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : 'Scan for Changes'}
          </Button>

          {preview && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800 font-medium mb-2">
                Found {preview.changes.length} individuals to update (of {preview.total} total)
              </p>
              {preview.changes.length > 0 && (
                <>
                  <div className="max-h-48 overflow-auto mb-4 bg-white rounded p-2">
                    {preview.changes.slice(0, 20).map(change => (
                      <div key={change.id} className="text-xs py-1 border-b">
                        <span className="font-mono">{change.individual_id}</span>: 
                        <span className="text-red-600"> {String(change.current)}</span> → 
                        <span className="text-green-600"> {change.new}</span>
                      </div>
                    ))}
                    {preview.changes.length > 20 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ... and {preview.changes.length - 20} more
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={migrateData}
                    disabled={migrating}
                  >
                    {migrating ? 'Migrating...' : 'Apply Migration'}
                  </Button>
                </>
              )}
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                ✓ Updated {result.updated} of {result.total} individuals
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}