import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function CustomTraitsEntry({ experimentId, experiment, currentDate }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [traitValues, setTraitValues] = useState({});
  const [categoryFilters, setCategoryFilters] = useState({});

  const { data: individuals = [] } = useQuery({
    queryKey: ['individuals', experimentId, categoryFilters],
    queryFn: async () => {
      let query = { experiment_id: experimentId, alive: true };
      Object.entries(categoryFilters).forEach(([key, value]) => {
        if (value !== 'all') {
          query[`factors.${key}`] = value;
        }
      });
      return base44.entities.Individual.filter(query);
    },
    enabled: !!experimentId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ trait }) => {
      const processedIds = [];
      
      for (const id of selectedIds) {
        const ind = individuals.find(i => i.id === id);
        const currentCustomTraits = ind.custom_traits || {};
        const value = traitValues[id]?.[trait.field_name];
        
        let finalValue = value;
        if (trait.data_type === 'date' && trait.date_behavior === 'auto_updating') {
          finalValue = currentDate;
        }
        
        await base44.entities.Individual.update(id, {
          custom_traits: {
            ...currentCustomTraits,
            [trait.field_name]: finalValue
          }
        });
        
        processedIds.push(ind.individual_id);
      }
      
      return { trait, ids: processedIds };
    },
    onSuccess: async ({ trait, ids }) => {
      queryClient.invalidateQueries(['individuals']);
      
      const idsText = ids.length > 10 
        ? `${ids.slice(0, 5).join(', ')}, ... ${ids.slice(-5).join(', ')}`
        : ids.join(', ');
      
      await base44.entities.LabNote.create({
        experiment_id: experimentId,
        note: `${trait.name}: updated ${ids.length} individuals (IDs: ${idsText})`,
        timestamp: new Date().toISOString(),
      });
      
      setSelectedIds([]);
      setTraitValues({});
      alert(`${trait.name} data saved!`);
    },
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateTraitValue = (individualId, fieldName, value) => {
    setTraitValues(prev => ({
      ...prev,
      [individualId]: {
        ...(prev[individualId] || {}),
        [fieldName]: value
      }
    }));
  };

  const updateCategoryFilter = (factor, value) => {
    setCategoryFilters({ ...categoryFilters, [factor]: value });
  };

  const customTraits = experiment?.traits || [];
  if (customTraits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {experiment?.factors && (
        <Card>
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {experiment.factors.map((factor) => (
                <div key={factor.name}>
                  <label className="text-sm font-medium">{factor.name}</label>
                  <select
                    className="w-full border rounded p-2 mt-1"
                    value={categoryFilters[factor.name] || 'all'}
                    onChange={(e) => updateCategoryFilter(factor.name, e.target.value)}
                  >
                    <option value="all">All</option>
                    {factor.levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {customTraits.map((trait) => (
        <Card key={trait.field_name}>
          <CardHeader>
            <CardTitle>
              {trait.name}
              {trait.date_behavior && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({trait.date_behavior === 'fixed' ? 'Fixed date' : 'Auto-updating date'})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-gray-600">
              {individuals.length} individuals | {selectedIds.length} selected
            </div>
            
            <div className="space-y-2 max-h-96 overflow-auto mb-4">
              {individuals.map((ind) => (
                <div key={ind.id} className="flex items-center gap-3 p-2 border rounded">
                  <Checkbox
                    checked={selectedIds.includes(ind.id)}
                    onCheckedChange={() => toggleSelection(ind.id)}
                  />
                  <span className="font-mono w-40">{ind.individual_id}</span>
                  
                  {trait.data_type === 'numeric' && (
                    <Input
                      type="number"
                      placeholder="Value"
                      value={traitValues[ind.id]?.[trait.field_name] || ''}
                      onChange={(e) => updateTraitValue(ind.id, trait.field_name, e.target.value)}
                      className="w-32"
                    />
                  )}
                  
                  {trait.data_type === 'text' && (
                    <Input
                      placeholder="Value"
                      value={traitValues[ind.id]?.[trait.field_name] || ''}
                      onChange={(e) => updateTraitValue(ind.id, trait.field_name, e.target.value)}
                      className="w-48"
                    />
                  )}
                  
                  {trait.data_type === 'boolean' && (
                    <Checkbox
                      checked={traitValues[ind.id]?.[trait.field_name] === true}
                      onCheckedChange={(checked) => updateTraitValue(ind.id, trait.field_name, checked)}
                    />
                  )}
                  
                  {trait.data_type === 'date' && trait.date_behavior === 'fixed' && (
                    <Input
                      type="date"
                      value={traitValues[ind.id]?.[trait.field_name] || ''}
                      onChange={(e) => updateTraitValue(ind.id, trait.field_name, e.target.value)}
                      className="w-40"
                    />
                  )}
                  
                  {trait.data_type === 'date' && trait.date_behavior === 'auto_updating' && (
                    <span className="text-sm text-gray-500">Will use: {currentDate}</span>
                  )}
                  
                  {trait.data_type === 'category' && (
                    <select
                      className="border rounded p-2 w-40"
                      value={traitValues[ind.id]?.[trait.field_name] || ''}
                      onChange={(e) => updateTraitValue(ind.id, trait.field_name, e.target.value)}
                    >
                      <option value="">-</option>
                      {(trait.categories || []).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                  
                  <span className="text-xs text-gray-500 ml-auto">
                    Current: {ind.custom_traits?.[trait.field_name] !== undefined 
                      ? String(ind.custom_traits[trait.field_name]) 
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={() => saveMutation.mutate({ trait })}
              disabled={selectedIds.length === 0}
            >
              Save {trait.name}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}