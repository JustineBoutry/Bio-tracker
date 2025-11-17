import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategorySelector({ experiment, filters, onFilterChange }) {
  if (!experiment?.factors || experiment.factors.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900">Filter by Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {experiment.factors.map((factor) => (
          <div key={factor.name}>
            <Label>{factor.name}</Label>
            <Select
              value={filters[factor.name] || "all"}
              onValueChange={(value) => onFilterChange(factor.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`All ${factor.name}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {factor.name}</SelectItem>
                {factor.levels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}