import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExperiment } from "../components/ExperimentContext";

export default function MigrateInfectionData() {
  const { activeExperimentId } = useExperiment();
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);

  const migrateData = async () => {
    setMigrating(true);
    try {
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });

      let updated = 0;
      for (const ind of individuals) {
        let newStatus = "not_tested";
        
        if (ind.infected === true || ind.infected === "true") {
          newStatus = "confirmed Yes";
          updated++;
        } else if (ind.infected === false || ind.infected === "false") {
          newStatus = "confirmed No";
          updated++;
        }

        if (newStatus !== "not_tested") {
          await base44.entities.Individual.update(ind.id, {
            infected: newStatus
          });
        }
      }

      setResult({ total: individuals.length, updated });
      alert(`Migration complete! Updated ${updated} of ${individuals.length} individuals.`);
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
            onClick={migrateData}
            disabled={migrating}
          >
            {migrating ? 'Migrating...' : 'Run Migration'}
          </Button>

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