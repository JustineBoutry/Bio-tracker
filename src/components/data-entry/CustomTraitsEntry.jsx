import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomTraitsEntry({ 
  selectedIndividuals, 
  customTraits, 
  onUpdate,
  context = "standalone"
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
                      setTraitValues({ ...traitValues, [trait.name]: parseFloat(e.target.value) || 0 })
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