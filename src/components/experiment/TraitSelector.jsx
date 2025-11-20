import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";

const PREDEFINED_TRAITS = [
  { name: "Death", field_name: "death_date", data_type: "boolean", entry_mode: "individual" },
  { name: "Reproduction", field_name: "reproduction", data_type: "numeric", entry_mode: "individual" },
  { name: "Redness", field_name: "red_signal_count", data_type: "numeric", entry_mode: "individual" },
  { name: "Infection", field_name: "infected", data_type: "boolean", entry_mode: "batch" },
];

const ADDITIONAL_TRAITS = [
  { name: "Size before", field_name: "size_before", data_type: "numeric", entry_mode: "individual" },
  { name: "Size after", field_name: "size_after", data_type: "numeric", entry_mode: "individual" },
  { name: "Number of attached rotifers", field_name: "attached_rotifers", data_type: "numeric", entry_mode: "individual" },
  { name: "Presence of grapes", field_name: "has_grapes", data_type: "boolean", entry_mode: "individual" },
  { name: "Number of grapes", field_name: "grapes_count", data_type: "numeric", entry_mode: "individual" },
  { name: "Presence of cauliflower", field_name: "has_cauliflower", data_type: "boolean", entry_mode: "individual" },
  { name: "Number of cauliflowers", field_name: "cauliflowers_count", data_type: "numeric", entry_mode: "individual" },
  { name: "Size of cauliflowers", field_name: "cauliflowers_size", data_type: "numeric", entry_mode: "individual" },
];

export default function TraitSelector({ selectedTraits, onChange }) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTrait, setCustomTrait] = useState({
    name: "",
    data_type: "numeric",
    entry_mode: "individual",
    categories: []
  });
  const [categoryInput, setCategoryInput] = useState("");

  const isSelected = (fieldName) => {
    return selectedTraits.some(t => t.field_name === fieldName);
  };

  const toggleTrait = (trait) => {
    if (isSelected(trait.field_name)) {
      onChange(selectedTraits.filter(t => t.field_name !== trait.field_name));
    } else {
      onChange([...selectedTraits, trait]);
    }
  };

  const addCustomTrait = () => {
    if (!customTrait.name) return;
    
    const fieldName = customTrait.name.toLowerCase().replace(/\s+/g, '_');
    const newTrait = {
      name: customTrait.name,
      field_name: fieldName,
      data_type: customTrait.data_type,
      entry_mode: customTrait.entry_mode,
      categories: customTrait.data_type === 'category' ? customTrait.categories : undefined
    };
    
    onChange([...selectedTraits, newTrait]);
    setShowCustomForm(false);
    setCustomTrait({
      name: "",
      data_type: "numeric",
      entry_mode: "individual",
      categories: []
    });
  };

  const addCategory = () => {
    if (categoryInput.trim()) {
      setCustomTrait({
        ...customTrait,
        categories: [...customTrait.categories, categoryInput.trim()]
      });
      setCategoryInput("");
    }
  };

  const removeCategory = (index) => {
    setCustomTrait({
      ...customTrait,
      categories: customTrait.categories.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Core Traits (Already in use)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PREDEFINED_TRAITS.map((trait) => (
              <div key={trait.field_name} className="flex items-center gap-3 p-3 border rounded">
                <Checkbox
                  checked={isSelected(trait.field_name)}
                  onCheckedChange={() => toggleTrait(trait)}
                />
                <div className="flex-1">
                  <div className="font-medium">{trait.name}</div>
                  <div className="text-sm text-gray-500">
                    {trait.data_type} • {trait.entry_mode} entry
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Predefined Traits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ADDITIONAL_TRAITS.map((trait) => (
              <div key={trait.field_name} className="flex items-center gap-3 p-3 border rounded">
                <Checkbox
                  checked={isSelected(trait.field_name)}
                  onCheckedChange={() => toggleTrait(trait)}
                />
                <div className="flex-1">
                  <div className="font-medium">{trait.name}</div>
                  <div className="text-sm text-gray-500">
                    {trait.data_type} • {trait.entry_mode} entry
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Traits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTraits.filter(t => 
            ![...PREDEFINED_TRAITS, ...ADDITIONAL_TRAITS].some(p => p.field_name === t.field_name)
          ).map((trait, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 border rounded bg-blue-50">
              <div className="flex-1">
                <div className="font-medium">{trait.name}</div>
                <div className="text-sm text-gray-500">
                  {trait.data_type} • {trait.entry_mode} entry
                  {trait.categories && ` • ${trait.categories.length} categories`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(selectedTraits.filter((_, i) => 
                  selectedTraits.indexOf(trait) !== i
                ))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {!showCustomForm ? (
            <Button onClick={() => setShowCustomForm(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add custom trait
            </Button>
          ) : (
            <div className="border p-4 rounded space-y-4">
              <div>
                <label className="text-sm font-medium">Trait name</label>
                <Input
                  value={customTrait.name}
                  onChange={(e) => setCustomTrait({ ...customTrait, name: e.target.value })}
                  placeholder="e.g., Body length"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data type</label>
                <select
                  className="w-full border rounded p-2"
                  value={customTrait.data_type}
                  onChange={(e) => setCustomTrait({ ...customTrait, data_type: e.target.value })}
                >
                  <option value="numeric">Numeric value</option>
                  <option value="boolean">Yes / No</option>
                  <option value="category">Category</option>
                </select>
              </div>

              {customTrait.data_type === 'category' && (
                <div>
                  <label className="text-sm font-medium">Categories</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      placeholder="Add category"
                      onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    />
                    <Button onClick={addCategory} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {customTrait.categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="flex-1">{cat}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCategory(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Entry mode</label>
                <select
                  className="w-full border rounded p-2"
                  value={customTrait.entry_mode}
                  onChange={(e) => setCustomTrait({ ...customTrait, entry_mode: e.target.value })}
                >
                  <option value="individual">Individual entry (one by one)</option>
                  <option value="batch">Batch entry (list)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={addCustomTrait} disabled={!customTrait.name}>
                  Add trait
                </Button>
                <Button variant="outline" onClick={() => setShowCustomForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}