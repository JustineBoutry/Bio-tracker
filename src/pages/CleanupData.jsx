import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, CheckCircle, Edit2, X, UserX } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';

export default function CleanupData() {
  const { t } = useTranslation();
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
  const [deathDateMismatches, setDeathDateMismatches] = useState([]);
  const [scanningDeathDates, setScanningDeathDates] = useState(false);
  const [deathDateActions, setDeathDateActions] = useState({});
  const [lostIndividuals, setLostIndividuals] = useState('');
  const [markingLost, setMarkingLost] = useState(false);

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
      console.log('Starting scan for experiment:', activeExperimentId);
      
      // Get all individuals in this experiment first
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });
      const individualIds = new Set(individuals.map(i => i.individual_id));
      console.log('Found individuals:', individualIds.size);
      
      // Get ALL reproduction events (not filtered by experiment_id)
      const allEvents = await base44.entities.ReproductionEvent.list();
      console.log('Total events in database:', allEvents.length);
      
      // Filter to only events for this experiment's individuals
      const events = allEvents.filter(e => individualIds.has(e.individual_id));
      console.log('Events for this experiment:', events.length);

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
          console.log('Found duplicate:', key, eventList.length, 'events');
          duplicates.push({
            individual_id: eventList[0].individual_id,
            event_date: eventList[0].event_date,
            count: eventList.length,
            events: eventList
          });
        }
      });

      console.log('Total duplicates found:', duplicates.length);
      setDuplicatesFound(duplicates);
      
      if (duplicates.length === 0) {
        alert('No duplicates found!');
      }
    } catch (error) {
      console.error('Scan error:', error);
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

  const scanDeathDateMismatches = async () => {
    setScanningDeathDates(true);
    setDeathDateMismatches([]);
    try {
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId,
        alive: false
      });
      const notes = await base44.entities.LabNote.filter({ 
        experiment_id: activeExperimentId 
      });

      const mismatches = [];
      
      for (const ind of individuals) {
        if (!ind.death_date) continue;
        
        // Find lab notes mentioning this individual's death
        const deathNotes = notes.filter(note => {
          const text = note.note.toLowerCase();
          if (!text.includes('death:')) return false;
          
          // Check if this individual is mentioned
          const match = note.note.match(/\(ids?:\s*([^)]+)\)/i);
          if (match) {
            const ids = match[1].split(/[\s,]+/).map(id => id.trim());
            return ids.includes(ind.individual_id);
          }
          return false;
        });

        if (deathNotes.length > 0) {
          // Get the date from the lab note timestamp
          const noteDate = deathNotes[0].timestamp.split('T')[0];
          
          if (noteDate !== ind.death_date) {
            mismatches.push({
              id: ind.id,
              individual_id: ind.individual_id,
              recorded_death_date: ind.death_date,
              note_date: noteDate,
              note_timestamp: deathNotes[0].timestamp
            });
          }
        }
      }

      setDeathDateMismatches(mismatches);
      
      // Initialize actions
      const actions = {};
      mismatches.forEach(m => {
        actions[m.id] = { action: 'ignore', newDate: m.note_date };
      });
      setDeathDateActions(actions);

      if (mismatches.length === 0) {
        alert('No death date mismatches found!');
      }
    } catch (error) {
      alert('Scan failed: ' + error.message);
    } finally {
      setScanningDeathDates(false);
    }
  };

  const setDeathDateAction = (id, action, newDate = null) => {
    setDeathDateActions(prev => ({
      ...prev,
      [id]: { action, newDate: newDate ?? prev[id]?.newDate }
    }));
  };

  const fixDeathDatesMutation = useMutation({
    mutationFn: async () => {
      const toFix = deathDateMismatches.filter(m => deathDateActions[m.id]?.action === 'fix');
      
      const updates = toFix.map(m => 
        base44.entities.Individual.update(m.id, {
          death_date: deathDateActions[m.id].newDate
        })
      );
      
      await Promise.all(updates);
      return toFix.length;
    },
    onSuccess: async (count) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        note: `Death date cleanup: corrected ${count} individuals`,
        timestamp: new Date().toISOString(),
      });

      setDeathDateMismatches([]);
      setDeathDateActions({});
      alert(`Fixed ${count} death dates!`);
    },
  });

  const fixInfectionMutation = useMutation({
    mutationFn: async () => {
      const updates = infectionPreview.corrections.map(correction =>
        base44.entities.Individual.update(correction.id, {
          infected: correction.suggested
        })
      );
      await Promise.all(updates);
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

      const eventUpdates = highOffspringEvents.map(async (event) => {
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
      });

      await Promise.all(eventUpdates);

      // Recalculate cumulative_offspring for affected individuals in parallel
      const individualUpdates = Array.from(affectedIndividuals).map(async (individual_id) => {
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
      });

      await Promise.all(individualUpdates);

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

  const markLostMutation = useMutation({
    mutationFn: async (ids) => {
      const individuals = await base44.entities.Individual.filter({ 
        experiment_id: activeExperimentId 
      });
      
      const toUpdate = individuals.filter(ind => ids.includes(ind.individual_id));
      
      const updates = toUpdate.map(ind =>
        base44.entities.Individual.update(ind.id, {
          alive: false,
          death_date: 'lost'
        })
      );
      
      await Promise.all(updates);
      return toUpdate.length;
    },
    onSuccess: async (count) => {
      queryClient.invalidateQueries(['individuals']);
      
      await base44.entities.LabNote.create({
        experiment_id: activeExperimentId,
        note: `Marked ${count} individuals as lost: ${lostIndividuals}`,
        timestamp: new Date().toISOString(),
      });

      setLostIndividuals('');
      alert(`Marked ${count} individuals as lost!`);
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const affectedIndividuals = new Set();

      const deletions = duplicatesFound.map(async (duplicate) => {
        // Keep the first event, delete the rest
        const toDelete = duplicate.events.slice(1);

        await Promise.all(toDelete.map(event => 
          base44.entities.ReproductionEvent.delete(event.id)
        ));

        affectedIndividuals.add(duplicate.individual_id);
      });

      await Promise.all(deletions);

      // Recalculate cumulative_offspring for affected individuals in parallel
      const individualUpdates = Array.from(affectedIndividuals).map(async (individual_id) => {
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
      });

      await Promise.all(individualUpdates);

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
        <p className="text-gray-600">{t('cleanup.noExperiment')}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('cleanup.title')}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('cleanup.scanDuplicates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('cleanup.scanDuplicatesDesc')}
          </p>
          <Button 
            onClick={scanForDuplicates}
            disabled={scanning}
          >
            {scanning ? t('common.loading') : t('cleanup.scan')}
          </Button>
        </CardContent>
      </Card>

      {cleaned && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{t('cleanup.cleanSuccess')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {duplicatesFound.length > 0 && !cleaned && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              {t('cleanup.foundDuplicates', { count: duplicatesFound.length })}
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
              {cleanupMutation.isPending ? t('cleanup.cleaning') : t('cleanup.removeDuplicates')}
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
          <CardTitle>{t('cleanup.scanHighOffspring')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('cleanup.scanHighOffspringDesc')}
          </p>
          <Button 
            onClick={scanForHighOffspring}
            disabled={scanningHighOffspring}
          >
            {scanningHighOffspring ? t('common.loading') : t('cleanup.scanHigh')}
          </Button>
        </CardContent>
      </Card>

      {highOffspringEvents.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              {t('cleanup.foundHigh', { count: highOffspringEvents.length })}
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
                        <option value="ignore">{t('cleanup.ignore')}</option>
                        <option value="edit">{t('common.edit')}</option>
                        <option value="delete">{t('common.delete')}</option>
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
              {processHighOffspringMutation.isPending ? t('cleanup.processing') : t('cleanup.applyChanges')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 mt-8">
        <CardHeader>
          <CardTitle>{t('cleanup.markLost')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('cleanup.markLostDesc')}
          </p>
          <div className="space-y-3">
            <textarea
              className="w-full border rounded p-3 font-mono text-sm"
              rows="4"
              placeholder={t('cleanup.enterIds')}
              value={lostIndividuals}
              onChange={(e) => setLostIndividuals(e.target.value)}
            />
            <Button 
              onClick={() => {
                const ids = lostIndividuals.split(/[\s,]+/).map(id => id.trim()).filter(Boolean);
                if (ids.length === 0) {
                  alert('Please enter at least one individual ID');
                  return;
                }
                if (confirm(`Mark ${ids.length} individual(s) as lost?`)) {
                  markLostMutation.mutate(ids);
                }
              }}
              disabled={markingLost || !lostIndividuals.trim()}
            >
              <UserX className="w-4 h-4 mr-2" />
              {markingLost ? t('cleanup.marking') : t('cleanup.markLost')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 mt-8">
        <CardHeader>
          <CardTitle>{t('cleanup.fixInfection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('cleanup.fixInfectionDesc')}
          </p>
          <Button 
            onClick={scanInfectionStatus}
            disabled={scanningInfection}
          >
            {scanningInfection ? t('common.loading') : t('cleanup.scanInfection')}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 mt-8">
        <CardHeader>
          <CardTitle>{t('cleanup.fixDeathDates')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('cleanup.fixDeathDatesDesc')}
          </p>
          <Button 
            onClick={scanDeathDateMismatches}
            disabled={scanningDeathDates}
          >
            {scanningDeathDates ? t('common.loading') : t('cleanup.scanDeathDates')}
          </Button>
        </CardContent>
      </Card>

      {deathDateMismatches.length > 0 && (
        <Card className="mb-6 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <AlertTriangle className="w-5 h-5" />
              {t('cleanup.foundMismatches', { count: deathDateMismatches.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto space-y-2">
              {deathDateMismatches.map((mismatch) => (
                <div key={mismatch.id} className="bg-white border border-purple-200 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-mono font-semibold">{mismatch.individual_id}</div>
                      <div className="text-sm text-gray-600">
                        Recorded: <span className="text-red-600">{mismatch.recorded_death_date}</span>
                        {' | '}
                        Lab note date: <span className="text-green-600">{mismatch.note_date}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        className="border rounded p-1 text-sm"
                        value={deathDateActions[mismatch.id]?.action || 'ignore'}
                        onChange={(e) => setDeathDateAction(mismatch.id, e.target.value)}
                      >
                        <option value="ignore">Ignore</option>
                        <option value="fix">Fix to note date</option>
                      </select>
                      
                      {deathDateActions[mismatch.id]?.action === 'fix' && (
                        <Input
                          type="date"
                          value={deathDateActions[mismatch.id]?.newDate || mismatch.note_date}
                          onChange={(e) => setDeathDateAction(mismatch.id, 'fix', e.target.value)}
                          className="w-36"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => fixDeathDatesMutation.mutate()}
              disabled={fixDeathDatesMutation.isPending || 
                Object.values(deathDateActions).every(a => a.action === 'ignore')}
            >
              {fixDeathDatesMutation.isPending ? t('cleanup.fixing') : t('cleanup.applyFixes')}
            </Button>
          </CardContent>
        </Card>
      )}

      {infectionPreview && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">
              {t('cleanup.foundCorrections', { count: infectionPreview.corrections.length })}
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
                    {fixInfectionMutation.isPending ? t('cleanup.fixing') : t('cleanup.applyCorrections')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={scanInfectionStatus}
                    disabled={fixInfectionMutation.isPending || scanningInfection}
                  >
                    {t('cleanup.scanInfection')}
                  </Button>
                </div>
              </>
            )}

            {infectionPreview.corrections.length === 0 && (
              <div className="text-center py-4 text-green-700">
                ✓ {t('cleanup.noCorrections')}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}