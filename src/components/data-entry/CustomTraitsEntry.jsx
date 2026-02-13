import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomTraitsEntry({ 
  selectedIndividuals, 
  customTraits, 
  onUpdate,
  context = "standalone",
  perIndividual = false,
  individualTraitValues = {}
}) {
  const [traitValues, setTraitValues] = useState({});

  const handleSave = () => {
    if (selectedIndividuals.length === 0) {
      alert('Please select at least one individual');
      return;
    }

    onUpdate(traitValues);
    setTraitValues({});
  };

  const filteredTraits = customTraits?.filter(trait => 
    trait.show_with === context || (context === "standalone" && (!trait.show_with || trait.show_with === "standalone"))
  ) || [];

  if (filteredTraits.length === 0 && context === "standalone") {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">
            No custom traits defined. Add them in Experiment Setup.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (filteredTraits.length === 0) {
    return null;
  }

  // Per-individual mode: render inline without card
  if (perIndividual) {
    const individualId = selectedIndividuals[0] || 'unknown';
    
    return (
      <div className="space-y-2 border-t pt-3 mt-3">
        {filteredTraits.length > 0 && (
          <div className="text-xs font-semibold text-gray-600 mb-2">Custom Traits:</div>
        )}
        {filteredTraits.map((trait) => (
          <div key={`${individualId}-${trait.name}`} className="grid grid-cols-2 gap-3 items-center">
            <label className="text-xs font-medium">{trait.name}</label>
            {trait.type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${individualId}-${trait.name}`}
                  checked={individualTraitValues[trait.name] || false}
                  onCheckedChange={(checked) => 
                    onUpdate({ ...individualTraitValues, [trait.name]: checked })
                  }
                />
                <span className="text-xs text-gray-600">{individualTraitValues[trait.name] ? 'Yes' : 'No'}</span>
              </div>
            ) : trait.type === 'number' ? (
              <Input
                type="number"
                id={`${individualId}-${trait.name}`}
                value={individualTraitValues[trait.name] || ''}
                onChange={(e) => 
                  onUpdate({ ...individualTraitValues, [trait.name]: parseFloat(e.target.value) || null })
                }
                placeholder={`Enter ${trait.name}`}
                className="h-8"
              />
            ) : (
              <Input
                type="text"
                id={`${individualId}-${trait.name}`}
                value={individualTraitValues[trait.name] || ''}
                onChange={(e) => 
                  onUpdate({ ...individualTraitValues, [trait.name]: e.target.value })
                }
                placeholder={`Enter ${trait.name}`}
                className="h-8"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          {context === "standalone" && (
            <p className="text-sm text-gray-600 mb-4">
              Selected {selectedIndividuals.length} individual(s)
            </p>
          )}

          <div className="space-y-4">
            {filteredTraits.map((trait, index) => (
              <div key={index}>
                <label className="text-sm font-medium block mb-2">{trait.name}</label>
                {trait.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={traitValues[trait.name] || false}
                      onCheckedChange={(checked) => 
                        setTraitValues({ ...traitValues, [trait.name]: checked })
                      }
                    />
                    <span className="text-sm">Yes</span>
                  </div>
                ) : trait.type === 'number' ? (
                  <Input
                    type="number"
                    value={traitValues[trait.name] || ''}
                    onChange={(e) => 
                      setTraitValues({ ...traitValues, [trait.name]: parseFloat(e.target.value) || null })
                    }
                    placeholder={`Enter ${trait.name}`}
                  />
                ) : (
                  <Input
                    type="text"
                    value={traitValues[trait.name] || ''}
                    onChange={(e) => 
                      setTraitValues({ ...traitValues, [trait.name]: e.target.value })
                    }
                    placeholder={`Enter ${trait.name}`}
                  />
                )}
              </div>
            ))}
          </div>

          {context === "standalone" && (
            <Button onClick={handleSave} className="mt-6">
              Save Custom Traits
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}