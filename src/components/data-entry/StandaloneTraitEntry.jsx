import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from 'react-i18next';

export default function StandaloneTraitEntry({ trait, allIndividuals, selectedExp }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isCheckboxMode = trait.selection_mode === 'checkbox';
  const [traitData, setTraitData] = useState(isCheckboxMode ? [] : '');
  const [traitValues, setTraitValues] = useState({});
  const [showValueEntry, setShowValueEntry] = useState(false);
  const [parsedIds, setParsedIds] = useState([]);

  const colorClasses = {
    gray: 'bg-gray-50',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
    pink: 'bg-pink-50',
    orange: 'bg-orange-50'
  };

  const filters = trait.filters || {
    alive_status: "alive",
    infection_status: "all",
    red_status: "all",
    sex: "all"
  };

  const filteredIndividuals = allIndividuals.filter(ind => {
    if (filters.alive_status === "alive" && !ind.alive) return false;
    if (filters.alive_status === "dead" && ind.alive) return false;
    
    if (filters.infection_status === "infected" && ind.infected !== "confirmed Yes") return false;
    if (filters.infection_status === "non_infected" && ind.infected !== "confirmed No") return false;
    if (filters.infection_status === "not_tested" && ind.infected !== "not_tested") return false;
    
    if (filters.red_status === "red_confirmed" && !ind.red_confirmed) return false;
    if (filters.red_status === "not_red" && ind.red_confirmed) return false;
    
    if (filters.sex === "male" && ind.sex !== "male") return false;
    if (filters.sex === "female" && ind.sex !== "female") return false;
    
    return true;
  });

  const handleCheckboxSubmit = async () => {
    const updates = traitData.map(async (id) => {
      const ind = allIndividuals.find((i) => i.id === id);
      const currentCustomData = ind.custom_data || {};
      await base44.entities.Individual.update(id, {
        custom_data: { ...currentCustomData, ...traitValues }
      });
      return ind.individual_id;
    });
    
    const ids = await Promise.all(updates);
    
    queryClient.invalidateQueries(['individuals']);
    const idsText = ids.join(', ');
    await base44.entities.LabNote.create({
      experiment_id: selectedExp,
      note: `${trait.name}: updated ${ids.length} individuals (IDs: ${idsText})`,
      timestamp: new Date().toISOString()
    });
    
    setTraitData([]);
    setTraitValues({});
    alert(`${ids.length} individual(s) updated!`);
  };

  const parseIds = () => {
    const ids = traitData.split(/[\s,]+/).filter((id) => id.trim());
    setParsedIds(ids.map(id => id.trim()));
    
    const initialValues = {};
    ids.forEach(id => {
      const trimmedId = id.trim();
      if (trait.type === 'boolean') {
        initialValues[trimmedId] = false;
      } else if (trait.type === 'number') {
        initialValues[trimmedId] = null;
      } else {
        initialValues[trimmedId] = '';
      }
    });
    setTraitValues(initialValues);
    setShowValueEntry(true);
  };

  const handleIdListSubmit = async () => {
    const notFound = [];
    
    const updates = await Promise.all(parsedIds.map(async (individualId) => {
      const inds = await base44.entities.Individual.filter({
        experiment_id: selectedExp,
        individual_id: individualId
      });
      if (inds.length > 0) {
        const currentCustomData = inds[0].custom_data || {};
        await base44.entities.Individual.update(inds[0].id, {
          custom_data: { ...currentCustomData, [trait.name]: traitValues[individualId] }
        });
        return individualId;
      }
      notFound.push(individualId);
      return null;
    }));

    const successIds = updates.filter(id => id !== null);
    
    if (successIds.length > 0) {
      queryClient.invalidateQueries(['individuals']);
      const idsText = successIds.join(', ');
      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `${trait.name}: updated ${successIds.length} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString()
      });
    }
    
    setTraitData('');
    setTraitValues({});
    setShowValueEntry(false);
    setParsedIds([]);
    
    let message = `${successIds.length} individual(s) updated!`;
    if (notFound.length > 0) {
      message += `\n\nNot found: ${notFound.join(', ')}`;
    }
    alert(message);
  };

  return (
    <Card className={colorClasses[trait.color || 'gray']}>
      <CardHeader>
        <CardTitle>{trait.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {isCheckboxMode ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {filteredIndividuals.length} {t('common.individuals')} | {traitData.length} {t('common.selected')}
            </div>
            <div className="space-y-2 max-h-96 overflow-auto mb-4">
              {filteredIndividuals.map((ind) => (
                <div key={ind.id} className="flex items-center gap-3 p-2 border rounded bg-white">
                  <Checkbox
                    checked={traitData.includes(ind.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTraitData([...traitData, ind.id]);
                      } else {
                        setTraitData(traitData.filter(id => id !== ind.id));
                      }
                    }}
                  />
                  <span className="font-mono">{ind.individual_id}</span>
                </div>
              ))}
            </div>
            {traitData.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold">Enter {trait.name} value for selected individuals:</h4>
                {trait.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={traitValues[trait.name] || false}
                      onCheckedChange={(checked) => {
                        setTraitValues({ ...traitValues, [trait.name]: checked });
                      }}
                    />
                    <span className="text-sm">{traitValues[trait.name] ? 'Yes' : 'No'}</span>
                  </div>
                ) : trait.type === 'number' ? (
                  <Input
                    type="number"
                    value={traitValues[trait.name] || ''}
                    onChange={(e) => {
                      setTraitValues({ ...traitValues, [trait.name]: parseFloat(e.target.value) || null });
                    }}
                    placeholder={`Enter ${trait.name}`}
                  />
                ) : (
                  <Input
                    type="text"
                    value={traitValues[trait.name] || ''}
                    onChange={(e) => {
                      setTraitValues({ ...traitValues, [trait.name]: e.target.value });
                    }}
                    placeholder={`Enter ${trait.name}`}
                  />
                )}
                <Button onClick={handleCheckboxSubmit}>
                  {t('common.submit')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {!showValueEntry ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter Individual IDs (comma or space separated):</label>
                  <Textarea
                    placeholder="e.g., ID-001, ID-002, ID-003"
                    value={traitData}
                    onChange={(e) => setTraitData(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  className="mt-4"
                  onClick={parseIds}
                  disabled={!traitData.trim()}
                >
                  Continue to Enter Values
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-auto mb-4">
                  {parsedIds.map((individualId) => (
                    <div key={individualId} className="border p-3 rounded space-y-2 bg-white">
                      <div className="font-mono font-semibold">{individualId}</div>
                      <div>
                        <label className="text-sm">{trait.name}</label>
                        {trait.type === 'boolean' ? (
                          <div className="flex items-center gap-2 h-10">
                            <Checkbox
                              checked={traitValues[individualId] || false}
                              onCheckedChange={(checked) => {
                                setTraitValues({ ...traitValues, [individualId]: checked });
                              }}
                            />
                            <span className="text-sm">{traitValues[individualId] ? 'Yes' : 'No'}</span>
                          </div>
                        ) : trait.type === 'number' ? (
                          <Input
                            type="number"
                            value={traitValues[individualId] || ''}
                            onChange={(e) => {
                              setTraitValues({ ...traitValues, [individualId]: parseFloat(e.target.value) || null });
                            }}
                            placeholder={`Enter ${trait.name}`}
                          />
                        ) : (
                          <Input
                            type="text"
                            value={traitValues[individualId] || ''}
                            onChange={(e) => {
                              setTraitValues({ ...traitValues, [individualId]: e.target.value });
                            }}
                            placeholder={`Enter ${trait.name}`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleIdListSubmit}>
                    {t('common.submit')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowValueEntry(false);
                      setTraitData('');
                      setParsedIds([]);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}