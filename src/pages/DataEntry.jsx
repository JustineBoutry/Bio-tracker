import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useExperiment } from "../components/ExperimentContext";
import { Calendar, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function DataEntry() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const selectedExp = activeExperimentId;
  const [categoryFilters, setCategoryFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [offspringCounts, setOffspringCounts] = useState({});
  const [showOffspringEntry, setShowOffspringEntry] = useState(false);

  const [nonInfectedIds, setNonInfectedIds] = useState('');
  const [infectedIds, setInfectedIds] = useState('');
  const [showSporeEntry, setShowSporeEntry] = useState(false);
  const [sporeData, setSporeData] = useState({});
  const [maleIds, setMaleIds] = useState('');

  const [currentDataEntryDate, setCurrentDataEntryDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const resetToToday = () => {
    setCurrentDataEntryDate(new Date().toISOString().split('T')[0]);
  };

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExp],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExp });
      return exps[0];
    },
    enabled: !!selectedExp
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp, categoryFilters],
    queryFn: async () => {
      const results = await base44.entities.Individual.filter({ 
        experiment_id: selectedExp, 
        alive: true 
      });
      
      // Filter by selected categories (client-side for multiple selection support)
      const filtered = results.filter(ind => {
        return Object.entries(categoryFilters).every(([key, values]) => {
          if (!values || values.length === 0) return true; // "All" selected
          return values.includes(ind.factors?.[key]);
        });
      });
      
      // Sort individuals by numeric order
      return filtered.sort((a, b) => {
        const numA = parseFloat(a.individual_id.replace(/\D/g, '')) || 0;
        const numB = parseFloat(b.individual_id.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    },
    enabled: !!selectedExp
  });

  const reproductionMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedIds.map(async (id) => {
        const ind = individuals.find((i) => i.id === id);
        const offspring = offspringCounts[id] || 0;

        await base44.entities.ReproductionEvent.create({
          experiment_id: selectedExp,
          individual_id: ind.individual_id,
          event_date: currentDataEntryDate,
          offspring_count: offspring
        });

        await base44.entities.Individual.update(id, {
          first_reproduction_date: ind.first_reproduction_date || currentDataEntryDate,
          last_reproduction_date: currentDataEntryDate,
          cumulative_offspring: (ind.cumulative_offspring || 0) + offspring
        });

        return ind.individual_id;
      });

      return await Promise.all(updates);
    },
    onSuccess: async (ids) => {
      queryClient.invalidateQueries(['individuals']);

      const idsText = ids.join(', ');

      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Reproduction: updated ${ids.length} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString()
      });

      setSelectedIds([]);
      setOffspringCounts({});
      setShowOffspringEntry(false);
      alert('Reproduction recorded!');
    }
  });

  const deathMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedIds.map(async (id) => {
        const ind = individuals.find((i) => i.id === id);
        await base44.entities.Individual.update(id, {
          alive: false,
          death_date: currentDataEntryDate
        });
        return ind.individual_id;
      });

      return await Promise.all(updates);
    },
    onSuccess: async (ids) => {
      queryClient.invalidateQueries(['individuals']);

      const idsText = ids.join(', ');

      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Death: ${ids.length} individuals marked dead (IDs: ${idsText})`,
        timestamp: new Date().toISOString()
      });

      setSelectedIds([]);
      alert('Deaths recorded!');
    }
  });

  const rednessMutation = useMutation({
    mutationFn: async () => {
      const updates = selectedIds.map(async (id) => {
        const ind = individuals.find((i) => i.id === id);
        const newCount = (ind.red_signal_count || 0) + 1;
        await base44.entities.Individual.update(id, {
          red_signal_count: newCount,
          red_confirmed: newCount >= 3
        });
        return { id: ind.individual_id, newCount, wasConfirmed: ind.red_confirmed, nowConfirmed: newCount >= 3 };
      });

      return await Promise.all(updates);
    },
    onSuccess: async (results) => {
      queryClient.invalidateQueries(['individuals']);

      const idsWithCounts = results.map(r => `${r.id} (${r.newCount})`).join(', ');
      const newlyConfirmed = results.filter(r => !r.wasConfirmed && r.nowConfirmed);

      let note = `Red signal on ${currentDataEntryDate}: ${results.length} individuals marked red (IDs: ${idsWithCounts})`;
      if (newlyConfirmed.length > 0) {
        const confirmedIds = newlyConfirmed.map(r => r.id).join(', ');
        note += `. Newly confirmed red: ${confirmedIds}`;
      }

      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: note,
        timestamp: new Date().toISOString()
      });

      setSelectedIds([]);
      alert('Red signals recorded!');
    }
  });

  const markNonInfectedMutation = useMutation({
    mutationFn: async () => {
      const ids = nonInfectedIds.split(/[\s,]+/).filter((id) => id.trim());
      const notFound = [];
      
      const updates = await Promise.all(ids.map(async (individualId) => {
        const trimmedId = individualId.trim();
        const inds = await base44.entities.Individual.filter({
          experiment_id: selectedExp,
          individual_id: trimmedId
        });
        if (inds.length > 0) {
          await base44.entities.Individual.update(inds[0].id, {
            infected: "confirmed No",
            spores_count: null,
            spores_volume: null
          });
          return trimmedId;
        }
        notFound.push(trimmedId);
        return null;
      }));

      const successIds = updates.filter(id => id !== null);
      return { successIds, notFound };
    },
    onSuccess: async ({ successIds, notFound }) => {
      queryClient.invalidateQueries(['individuals']);

      if (successIds.length > 0) {
        const idsText = successIds.join(', ');

        await base44.entities.LabNote.create({
          experiment_id: selectedExp,
          note: `Infection: ${successIds.length} individuals marked non-infected (IDs: ${idsText})`,
          timestamp: new Date().toISOString()
        });
      }

      setNonInfectedIds('');
      
      let message = `${successIds.length} individual(s) marked as non-infected!`;
      if (notFound.length > 0) {
        message += `\n\nNot found: ${notFound.join(', ')}`;
      }
      alert(message);
    },
    onError: (error) => {
      alert('Error: ' + error.message);
    }
  });

  const markMalesMutation = useMutation({
    mutationFn: async () => {
      const ids = maleIds.split(/[\s,]+/).filter((id) => id.trim());
      const notFound = [];
      
      const updates = await Promise.all(ids.map(async (individualId) => {
        const trimmedId = individualId.trim();
        const inds = await base44.entities.Individual.filter({
          experiment_id: selectedExp,
          individual_id: trimmedId
        });
        if (inds.length > 0) {
          await base44.entities.Individual.update(inds[0].id, {
            sex: "male"
          });
          return trimmedId;
        }
        notFound.push(trimmedId);
        return null;
      }));

      const successIds = updates.filter(id => id !== null);
      return { successIds, notFound };
    },
    onSuccess: async ({ successIds, notFound }) => {
      queryClient.invalidateQueries(['individuals']);

      if (successIds.length > 0) {
        const idsText = successIds.join(', ');

        await base44.entities.LabNote.create({
          experiment_id: selectedExp,
          note: `Sex: ${successIds.length} individuals marked as male (IDs: ${idsText})`,
          timestamp: new Date().toISOString()
        });
      }

      setMaleIds('');
      
      let message = `${successIds.length} individual(s) marked as male!`;
      if (notFound.length > 0) {
        message += `\n\nNot found: ${notFound.join(', ')}`;
      }
      alert(message);
    },
    onError: (error) => {
      alert('Error: ' + error.message);
    }
  });

  const parseInfectedIds = () => {
    const ids = infectedIds.split(/[\s,]+/).filter((id) => id.trim());
    const data = {};
    ids.forEach((id) => {
      data[id.trim()] = { volume: '', count: '' };
    });
    setSporeData(data);
    setShowSporeEntry(true);
  };

  const saveInfectedMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(sporeData).map(async ([individualId, data]) => {
        const inds = await base44.entities.Individual.filter({
          experiment_id: selectedExp,
          individual_id: individualId
        });
        if (inds.length > 0) {
          await base44.entities.Individual.update(inds[0].id, {
            infected: "confirmed Yes",
            spores_volume: data.volume,
            spores_count: parseFloat(data.count) || 0
          });
          return individualId;
        }
        return null;
      });

      const results = await Promise.all(updates);
      return results.filter(id => id !== null);
    },
    onSuccess: async (ids) => {
      queryClient.invalidateQueries(['individuals']);

      const idsText = ids.join(', ');

      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Infection: ${ids.length} individuals marked infected with spore data (IDs: ${idsText})`,
        timestamp: new Date().toISOString()
      });

      setInfectedIds('');
      setSporeData({});
      setShowSporeEntry(false);
      alert('Infection data saved!');
    }
  });

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const updateCategoryFilter = (factor, value) => {
    setCategoryFilters({ ...categoryFilters, [factor]: value });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('dataEntry.title')}</h1>

      {selectedExp &&
      <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {t('dataEntry.currentDateEntry')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                  type="date"
                  value={currentDataEntryDate}
                  onChange={(e) => setCurrentDataEntryDate(e.target.value)}
                  className="max-w-xs" />

                  <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToToday}>

                    {t('dataEntry.useTodayDate')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      }

      {selectedExp && experiment?.factors &&
      <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('dataEntry.filterMultiple')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experiment.factors.map((factor) =>
            <div key={factor.name} className="border rounded p-3">
                  <label className="text-sm font-semibold block mb-2">{factor.name}</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${factor.name}-all`}
                        checked={!categoryFilters[factor.name] || categoryFilters[factor.name].length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateCategoryFilter(factor.name, []);
                          }
                        }}
                      />
                      <label htmlFor={`${factor.name}-all`} className="text-sm cursor-pointer font-medium">
                        {t('common.all')}
                      </label>
                    </div>
                    {factor.levels.map((level) => (
                      <div key={level} className="flex items-center gap-2">
                        <Checkbox
                          id={`${factor.name}-${level}`}
                          checked={categoryFilters[factor.name]?.includes(level)}
                          onCheckedChange={(checked) => {
                            const current = categoryFilters[factor.name] || [];
                            if (checked) {
                              updateCategoryFilter(factor.name, [...current, level]);
                            } else {
                              updateCategoryFilter(factor.name, current.filter(l => l !== level));
                            }
                          }}
                        />
                        <label htmlFor={`${factor.name}-${level}`} className="text-sm cursor-pointer">
                          {level}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
            )}
            </div>
          </CardContent>
        </Card>
      }

      {selectedExp &&
      <Tabs defaultValue="reproduction">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="reproduction" className="text-slate-900 px-3 py-1 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">{t('dataEntry.reproduction')}</TabsTrigger>
            <TabsTrigger value="death" className="bg-slate-500 text-slate-50 px-3 py-1 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">{t('dataEntry.death')}</TabsTrigger>
            <TabsTrigger value="redness" className="bg-[#f7c5c5] text-slate-900 px-3 py-1 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">{t('dataEntry.redness')}</TabsTrigger>
            <TabsTrigger value="infection" className="text-slate-900 px-3 py-1 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">{t('dataEntry.infection')}</TabsTrigger>
            <TabsTrigger value="sex" className="text-slate-900 px-3 py-1 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">{t('dataEntry.sex')}</TabsTrigger>
          </TabsList>

          <TabsContent value="reproduction">
            {!showOffspringEntry ?
          <Card>
                <CardHeader>
                  <CardTitle>{t('dataEntry.selectIndividualsReproduced')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm text-gray-600">
                    {individuals.length} {t('common.individuals')} | {selectedIds.length} {t('common.selected')}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-auto mb-4">
                    {individuals.map((ind) =>
                <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                        <Checkbox
                    checked={selectedIds.includes(ind.id)}
                    onCheckedChange={() => toggleSelection(ind.id)} />

                        <span className="font-mono">{ind.individual_id}</span>
                      </div>
                )}
                  </div>
                  <Button
                onClick={() => {
                  setShowOffspringEntry(true);
                  const counts = {};
                  selectedIds.forEach((id) => counts[id] = 0);
                  setOffspringCounts(counts);
                }}
                disabled={selectedIds.length === 0}>

                    {t('dataEntry.enterOffspring')}
                  </Button>
                </CardContent>
              </Card> :

          <Card>
                <CardHeader>
                  <CardTitle>{t('dataEntry.enterOffspring')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-auto mb-4">
                    {selectedIds.map((id) => {
                  const ind = individuals.find((i) => i.id === id);
                  return (
                    <div key={id} className="flex items-center gap-3 p-2 border rounded">
                          <span className="font-mono w-40">{ind.individual_id}</span>
                          <Input
                        type="number"
                        min="0"
                        value={offspringCounts[id] || 0}
                        onChange={(e) => setOffspringCounts({
                          ...offspringCounts,
                          [id]: parseInt(e.target.value) || 0
                        })}
                        className="w-32" />

                        </div>);

                })}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => reproductionMutation.mutate()}>
                      {t('common.submit')}
                    </Button>
                    <Button
                  variant="outline"
                  onClick={() => {
                    setShowOffspringEntry(false);
                    setSelectedIds([]);
                  }}>

                      {t('common.cancel')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          }
          </TabsContent>

          <TabsContent value="death">
            <Card className="bg-slate-500 text-card-foreground rounded-xl border shadow">
              <CardHeader>
                <CardTitle className="text-slate-50 font-semibold tracking-tight leading-none">{t('dataEntry.selectIndividualsDied')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-slate-50 mb-4 text-sm">
                  {individuals.length} {t('common.individuals')} | {selectedIds.length} {t('common.selected')}
                </div>
                <div className="space-y-2 max-h-96 overflow-auto mb-4">
                  {individuals.map((ind) =>
                <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                    checked={selectedIds.includes(ind.id)}
                    onCheckedChange={() => toggleSelection(ind.id)} />

                      <span className="text-slate-50 font-mono">{ind.individual_id}</span>
                    </div>
                )}
                </div>
                <Button
                onClick={() => deathMutation.mutate()}
                disabled={selectedIds.length === 0}>

                  {t('dataEntry.markAsDead')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redness">
            <Card className="bg-[#fdd9d9] text-card-foreground rounded-xl border shadow">
              <CardHeader>
                <CardTitle>{t('dataEntry.selectIndividualsRed')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-sm text-gray-600">
                  {individuals.length} {t('common.individuals')} | {selectedIds.length} {t('common.selected')}
                </div>
                <div className="space-y-2 max-h-96 overflow-auto mb-4">
                  {individuals.map((ind) =>
                <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                      <Checkbox
                    checked={selectedIds.includes(ind.id)}
                    onCheckedChange={() => toggleSelection(ind.id)} />

                      <span className="font-mono flex-1">{ind.individual_id}</span>
                      <span className="text-sm text-gray-600">
                        {t('common.signals')}: {ind.red_signal_count || 0}
                        {ind.red_confirmed && ` ✓ ${t('common.confirmed')}`}
                      </span>
                    </div>
                )}
                </div>
                <Button
                onClick={() => rednessMutation.mutate()}
                disabled={selectedIds.length === 0}>

                  {t('dataEntry.markRedSignal')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infection">
            <Card>
              <CardHeader>
                <CardTitle>{t('dataEntry.infectionStatus')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">{t('dataEntry.markNotInfected')}</h3>
                  <Textarea
                  placeholder={t('dataEntry.enterIndividualCodes')}
                  value={nonInfectedIds}
                  onChange={(e) => setNonInfectedIds(e.target.value)}
                  rows={3} />

                  <Button
                  className="mt-2"
                  onClick={() => markNonInfectedMutation.mutate()}
                  disabled={!nonInfectedIds.trim() || markNonInfectedMutation.isPending}>
                    {markNonInfectedMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('dataEntry.processing')}
                      </>
                    ) : (
                      t('dataEntry.markAsNonInfected')
                    )}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-2">{t('dataEntry.markInfectedSpores')}</h3>
                  {!showSporeEntry ?
                <>
                      <Textarea
                    placeholder={t('dataEntry.enterInfectedCodes')}
                    value={infectedIds}
                    onChange={(e) => setInfectedIds(e.target.value)}
                    rows={3} />

                      <Button
                    className="mt-2"
                    onClick={parseInfectedIds}
                    disabled={!infectedIds.trim()}>

                        {t('dataEntry.enterSporeData')}
                      </Button>
                    </> :

                <>
                      <div className="space-y-3 max-h-96 overflow-auto mb-4">
                        {Object.keys(sporeData).map((individualId) =>
                    <div key={individualId} className="border p-3 rounded space-y-2">
                            <div className="font-mono font-semibold">{individualId}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm">{t('dataEntry.sporeVolume')}</label>
                                <Input
                            placeholder="e.g., 10µL"
                            value={sporeData[individualId].volume}
                            onChange={(e) => setSporeData({
                              ...sporeData,
                              [individualId]: { ...sporeData[individualId], volume: e.target.value }
                            })} />

                              </div>
                              <div>
                                <label className="text-sm">{t('dataEntry.sporeCount')}</label>
                                <Input
                            type="number"
                            placeholder={t('dataEntry.sporeCount')}
                            value={sporeData[individualId].count}
                            onChange={(e) => setSporeData({
                              ...sporeData,
                              [individualId]: { ...sporeData[individualId], count: e.target.value }
                            })} />

                              </div>
                            </div>
                          </div>
                    )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => saveInfectedMutation.mutate()}>
                          {t('dataEntry.saveInfectionData')}
                        </Button>
                        <Button
                      variant="outline"
                      onClick={() => {
                        setShowSporeEntry(false);
                        setInfectedIds('');
                        setSporeData({});
                      }}>

                          {t('common.cancel')}
                        </Button>
                      </div>
                    </>
                }
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sex">
            <Card>
              <CardHeader>
                <CardTitle>{t('dataEntry.markMales')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">{t('dataEntry.enterMaleIds')}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('dataEntry.maleIdsDescription')}
                  </p>
                  <Textarea
                    placeholder={t('dataEntry.enterMaleCodes')}
                    value={maleIds}
                    onChange={(e) => setMaleIds(e.target.value)}
                    rows={3}
                  />
                  <Button
                    className="mt-2"
                    onClick={() => markMalesMutation.mutate()}
                    disabled={!maleIds.trim() || markMalesMutation.isPending}
                  >
                    {markMalesMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('dataEntry.processing')}
                      </>
                    ) : (
                      t('dataEntry.markAsMale')
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      }
    </div>);

}