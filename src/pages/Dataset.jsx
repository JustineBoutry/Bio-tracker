import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useExperiment } from "../components/ExperimentContext";
import CorrectDataForm from "../components/dataset/CorrectDataForm";

export default function Dataset() {
  const queryClient = useQueryClient();
  const { activeExperimentId } = useExperiment();
  const selectedExp = activeExperimentId;
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [codeError, setCodeError] = useState(null);
  const [factorFilters, setFactorFilters] = useState({});
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAddCount, setBulkAddCount] = useState(1);

  const { data: experiment } = useQuery({
    queryKey: ['experiment', selectedExp],
    queryFn: async () => {
      const exps = await base44.entities.Experiment.filter({ id: selectedExp });
      return exps[0];
    },
    enabled: !!selectedExp,
  });

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', selectedExp],
    queryFn: () => base44.entities.Individual.filter({ experiment_id: selectedExp }),
    enabled: !!selectedExp,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, individual_id }) => {
      await base44.entities.Individual.update(id, data);
      return individual_id;
    },
    onSuccess: async (individual_id) => {
      queryClient.invalidateQueries(['individuals']);
      setEditingId(null);
      setCodeError(null);
      
      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Edited individual (ID: ${individual_id})`,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const addIndividualsMutation = useMutation({
    mutationFn: async (count) => {
      const exp = await base44.entities.Experiment.filter({ id: selectedExp });
      const currentExperiment = exp[0];
      const allInds = await base44.entities.Individual.filter({ experiment_id: selectedExp });
      
      const individualsToCreate = [];
      let counter;
      
      if (currentExperiment.code_generation_mode === 'numeric_id') {
        const prefix = currentExperiment.code_prefix || 'ID-';
        const existingNumbers = allInds
          .map(ind => ind.individual_id)
          .filter(id => id.startsWith(prefix))
          .map(id => parseInt(id.replace(prefix, '')))
          .filter(num => !isNaN(num));
        counter = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : (currentExperiment.code_starting_number || 1);
        
        for (let i = 0; i < count; i++) {
          individualsToCreate.push({
            individual_id: `${prefix}${counter + i}`,
            experiment_id: selectedExp,
            factors: {},
            alive: true,
            infected: false,
            red_signal_count: 0,
            red_confirmed: false,
            cumulative_offspring: 0
          });
        }
      } else {
        counter = allInds.length + 1;
        for (let i = 0; i < count; i++) {
          individualsToCreate.push({
            individual_id: `IND-${String(counter + i).padStart(4, '0')}`,
            experiment_id: selectedExp,
            factors: {},
            alive: true,
            infected: false,
            red_signal_count: 0,
            red_confirmed: false,
            cumulative_offspring: 0
          });
        }
      }
      
      await base44.entities.Individual.bulkCreate(individualsToCreate);
      return individualsToCreate;
    },
    onSuccess: async (created) => {
      queryClient.invalidateQueries(['individuals']);
      
      const ids = created.map(ind => ind.individual_id);
      const idsText = ids.length > 10 
        ? `${ids.slice(0, 5).join(', ')}, ... ${ids.slice(-5).join(', ')}`
        : ids.join(', ');
      
      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Added ${created.length} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString(),
      });
      
      setBulkAddCount(1);
      alert(`${created.length} individuals added!`);
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids) => {
      const deletedIds = [];
      for (const id of ids) {
        const ind = individuals.find(i => i.id === id);
        deletedIds.push(ind.individual_id);
        const events = await base44.entities.ReproductionEvent.filter({ individual_id: ind.individual_id });
        for (const event of events) {
          await base44.entities.ReproductionEvent.delete(event.id);
        }
        await base44.entities.Individual.delete(id);
      }
      return deletedIds;
    },
    onSuccess: async (individual_ids) => {
      queryClient.invalidateQueries(['individuals']);
      
      const idsText = individual_ids.length > 10 
        ? `${individual_ids.slice(0, 5).join(', ')}, ... ${individual_ids.slice(-5).join(', ')}`
        : individual_ids.join(', ');
      
      await base44.entities.LabNote.create({
        experiment_id: selectedExp,
        note: `Deleted ${individual_ids.length} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString(),
      });
      
      setSelectedIds([]);
      alert(`${individual_ids.length} individuals deleted!`);
    },
  });

  const startEdit = (ind) => {
    setEditingId(ind.id);
    setCodeError(null);
    const customTraits = {};
    (experiment?.traits || []).forEach(trait => {
      const value = ind.custom_traits?.[trait.field_name];
      customTraits[trait.field_name] = value !== undefined ? value : '';
    });
    setEditValues({
      individual_id: ind.individual_id,
      factors: ind.factors || {},
      alive: ind.alive,
      custom_traits: customTraits
    });
  };

  const handleSave = async (ind) => {
    if (editValues.individual_id !== ind.individual_id) {
      const duplicate = individuals.find(i => 
        i.id !== ind.id && i.individual_id === editValues.individual_id
      );
      if (duplicate) {
        setCodeError('Code must be unique within this experiment');
        return;
      }
    }
    updateMutation.mutate({ 
      id: ind.id, 
      data: editValues,
      individual_id: editValues.individual_id 
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} individuals? This will also delete all associated reproduction events.`)) {
      deleteSelectedMutation.mutate(selectedIds);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedIndividuals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedIndividuals.map(ind => ind.id));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const naturalSort = (a, b) => {
    const regex = /(\d+)|(\D+)/g;
    const aParts = a.match(regex) || [];
    const bParts = b.match(regex) || [];
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || '';
      const bPart = bParts[i] || '';
      
      const aIsNum = /^\d+$/.test(aPart);
      const bIsNum = /^\d+$/.test(bPart);
      
      if (aIsNum && bIsNum) {
        const diff = parseInt(aPart, 10) - parseInt(bPart, 10);
        if (diff !== 0) return diff;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredIndividuals = individuals.filter(ind => {
    return Object.entries(factorFilters).every(([factorName, selectedValues]) => {
      if (!selectedValues || selectedValues.length === 0) return true;
      const indValue = ind.factors?.[factorName];
      return selectedValues.includes(indValue);
    });
  });

  const sortedIndividuals = sortColumn ? [...filteredIndividuals].sort((a, b) => {
    let valA, valB;
    
    if (sortColumn === 'code') {
      valA = a.individual_id || '';
      valB = b.individual_id || '';
      const result = naturalSort(valA, valB);
      return sortDirection === 'asc' ? result : -result;
    } else if (sortColumn.startsWith('factor_')) {
      const factorName = sortColumn.replace('factor_', '');
      valA = a.factors?.[factorName] || '';
      valB = b.factors?.[factorName] || '';
    } else {
      valA = a[sortColumn] ?? '';
      valB = b[sortColumn] ?? '';
    }
    
    if (sortColumn !== 'code') {
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
  }) : filteredIndividuals;

  const exportCSV = () => {
    if (sortedIndividuals.length === 0) return;
    
    const factorKeys = individuals[0]?.factors ? Object.keys(individuals[0].factors) : [];
    const traitHeaders = (experiment?.traits || []).map(t => t.name);
    const allHeaders = ['Code', ...factorKeys, 'Alive', ...traitHeaders];
    
    const rows = sortedIndividuals.map(ind => {
      const factorValues = factorKeys.map(k => ind.factors?.[k] || '');
      const traitValues = (experiment?.traits || []).map(trait => {
        const value = ind.custom_traits?.[trait.field_name];
        if (trait.data_type === 'boolean') {
          return value === true ? 'Yes' : value === false ? 'No' : '';
        }
        return value !== undefined && value !== null && value !== '' ? String(value) : '';
      });
      return [ind.individual_id, ...factorValues, ind.alive ? 'Yes' : 'No', ...traitValues];
    });
    
    const csv = [allHeaders, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataset.csv';
    a.click();
  };

  return (
    <div className="p-8 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dataset</h1>
        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={exportCSV} disabled={!selectedExp || individuals.length === 0}>
            Export CSV
          </Button>
          <Input
            type="number"
            min="1"
            value={bulkAddCount}
            onChange={(e) => setBulkAddCount(parseInt(e.target.value) || 1)}
            className="w-20"
            placeholder="Count"
          />
          <Button onClick={() => addIndividualsMutation.mutate(bulkAddCount)} disabled={!selectedExp}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {selectedExp && (
        <CorrectDataForm
          experimentId={selectedExp}
          experiment={experiment}
          individuals={individuals}
        />
      )}

      {selectedExp && experiment && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {experiment.factors?.map(factor => {
                const uniqueLevels = [...new Set(
                  individuals.map(ind => ind.factors?.[factor.name]).filter(Boolean)
                )];

                return (
                  <div key={factor.name}>
                    <label className="text-sm font-medium block mb-1">{factor.name}</label>
                    <select
                      multiple
                      className="w-full border rounded p-2 text-sm"
                      size={Math.min(uniqueLevels.length + 1, 5)}
                      value={factorFilters[factor.name] || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setFactorFilters({
                          ...factorFilters,
                          [factor.name]: selected.length === 0 ? [] : selected
                        });
                      }}
                    >
                      <option value="">All</option>
                      {uniqueLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      Hold Ctrl/Cmd to select multiple
                    </div>
                  </div>
                );
              })}
            </div>
            {Object.keys(factorFilters).some(k => factorFilters[k]?.length > 0) && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setFactorFilters({})}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {selectedExp && (
        <Card>
          <CardHeader>
            <CardTitle>Individuals ({sortedIndividuals.length} of {individuals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {codeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
                {codeError}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-2 text-left sticky left-0 bg-gray-50">
                      <Checkbox
                        checked={selectedIds.length === sortedIndividuals.length && sortedIndividuals.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th 
                      className="p-2 text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('code')}
                    >
                      Code {sortColumn === 'code' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    {experiment?.factors && experiment.factors.map(factor => (
                      <th 
                        key={factor.name} 
                        className="p-2 text-left cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(`factor_${factor.name}`)}
                      >
                        {factor.name} {sortColumn === `factor_${factor.name}` && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                    <th className="p-2 text-left">Alive</th>
                    {(experiment?.traits || []).map((trait) => (
                      <th 
                        key={trait.field_name}
                        className="p-2 text-left cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(trait.field_name)}
                      >
                        {trait.name} {sortColumn === trait.field_name && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIndividuals.map((ind) => {
                    const renderTraitCell = (trait, isEditing) => {
                      const value = ind.custom_traits?.[trait.field_name];

                      if (isEditing) {
                        if (trait.data_type === 'numeric') {
                          return (
                            <Input
                              type="number"
                              value={editValues.custom_traits[trait.field_name] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                custom_traits: { ...editValues.custom_traits, [trait.field_name]: e.target.value }
                              })}
                              className="w-24"
                            />
                          );
                        } else if (trait.data_type === 'text') {
                          return (
                            <Input
                              value={editValues.custom_traits[trait.field_name] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                custom_traits: { ...editValues.custom_traits, [trait.field_name]: e.target.value }
                              })}
                              className="w-32"
                            />
                          );
                        } else if (trait.data_type === 'boolean') {
                          return (
                            <Checkbox
                              checked={editValues.custom_traits[trait.field_name] === true}
                              onCheckedChange={(checked) => setEditValues({
                                ...editValues,
                                custom_traits: { ...editValues.custom_traits, [trait.field_name]: checked }
                              })}
                            />
                          );
                        } else if (trait.data_type === 'date') {
                          return (
                            <Input
                              type="date"
                              value={editValues.custom_traits[trait.field_name] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                custom_traits: { ...editValues.custom_traits, [trait.field_name]: e.target.value }
                              })}
                              className="w-32"
                            />
                          );
                        } else if (trait.data_type === 'category') {
                          return (
                            <select
                              className="w-full border rounded p-1"
                              value={editValues.custom_traits[trait.field_name] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                custom_traits: { ...editValues.custom_traits, [trait.field_name]: e.target.value }
                              })}
                            >
                              <option value="">-</option>
                              {(trait.categories || []).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          );
                        }
                      } else {
                        if (trait.data_type === 'boolean') {
                          return value === true ? 'Yes' : value === false ? 'No' : '-';
                        }
                        return value !== undefined && value !== null && value !== '' ? String(value) : '-';
                      }
                    };

                    return (
                      <tr key={ind.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 sticky left-0 bg-white">
                          <Checkbox
                            checked={selectedIds.includes(ind.id)}
                            onCheckedChange={() => toggleSelectId(ind.id)}
                            disabled={editingId === ind.id}
                          />
                        </td>
                        {editingId === ind.id ? (
                          <>
                            <td className="p-2 bg-white">
                              <Input
                                value={editValues.individual_id}
                                onChange={(e) => 
                                  setEditValues({ ...editValues, individual_id: e.target.value })
                                }
                                className="w-32 font-mono"
                              />
                            </td>
                            {experiment?.factors && experiment.factors.map(factor => (
                              <td key={factor.name} className="p-2">
                                <select
                                  className="w-full border rounded p-1"
                                  value={editValues.factors[factor.name] || ''}
                                  onChange={(e) => 
                                    setEditValues({ 
                                      ...editValues, 
                                      factors: { ...editValues.factors, [factor.name]: e.target.value }
                                    })
                                  }
                                >
                                  <option value="">-</option>
                                  {factor.levels.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </>
                        ) : (
                          <>
                            <td className="p-2 font-mono bg-white">{ind.individual_id}</td>
                            {experiment?.factors && experiment.factors.map(factor => (
                              <td key={factor.name} className="p-2">{ind.factors?.[factor.name] || '-'}</td>
                            ))}
                          </>
                        )}

                        {editingId === ind.id ? (
                          <>
                            <td className="p-2">
                              <Checkbox
                                checked={editValues.alive}
                                onCheckedChange={(checked) => 
                                  setEditValues({ ...editValues, alive: checked })
                                }
                              />
                            </td>
                            {(experiment?.traits || []).map(trait => (
                              <td key={trait.field_name} className="p-2">
                                {renderTraitCell(trait, true)}
                              </td>
                            ))}
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => handleSave(ind)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingId(null);
                                  setCodeError(null);
                                }}>
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2">{ind.alive ? 'Yes' : 'No'}</td>
                            {(experiment?.traits || []).map(trait => (
                              <td key={trait.field_name} className="p-2">
                                {renderTraitCell(trait, false)}
                              </td>
                            ))}
                            <td className="p-2">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(ind)}>
                                Edit
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}