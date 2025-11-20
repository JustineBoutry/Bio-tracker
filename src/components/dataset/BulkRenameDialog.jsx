import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

export default function BulkRenameDialog({ selectedIndividuals, onRename, onClose }) {
  const [mode, setMode] = useState('prefix');
  const [prefix, setPrefix] = useState('ID-');
  const [startNumber, setStartNumber] = useState(1);
  const [template, setTemplate] = useState('EXP1-{n}');
  const [pattern1, setPattern1] = useState('');
  const [pattern2, setPattern2] = useState('');

  const handleApply = () => {
    let newCodes = [];

    if (mode === 'prefix') {
      newCodes = selectedIndividuals.map((_, idx) => 
        `${prefix}${startNumber + idx}`
      );
    } else if (mode === 'template') {
      newCodes = selectedIndividuals.map((_, idx) => 
        template.replace('{n}', startNumber + idx)
      );
    } else if (mode === 'pattern') {
      const detected = detectPattern(pattern1, pattern2);
      if (detected) {
        newCodes = selectedIndividuals.map((_, idx) => 
          generateFromPattern(detected, idx)
        );
      } else {
        alert('Could not detect pattern from the two values');
        return;
      }
    }

    onRename(newCodes);
  };

  const detectPattern = (val1, val2) => {
    if (!val1 || !val2) return null;
    
    // Extract numeric parts
    const regex = /^(.*?)(\d+)(.*)$/;
    const match1 = val1.match(regex);
    const match2 = val2.match(regex);
    
    if (!match1 || !match2) return null;
    
    const [, prefix1, num1, suffix1] = match1;
    const [, prefix2, num2, suffix2] = match2;
    
    if (prefix1 === prefix2 && suffix1 === suffix2) {
      const increment = parseInt(num2) - parseInt(num1);
      return {
        prefix: prefix1,
        suffix: suffix1,
        start: parseInt(num1),
        increment: increment,
        digitCount: num1.length
      };
    }
    
    return null;
  };

  const generateFromPattern = (pattern, index) => {
    const num = pattern.start + (pattern.increment * index);
    const numStr = String(num).padStart(pattern.digitCount, '0');
    return `${pattern.prefix}${numStr}${pattern.suffix}`;
  };

  const previewCodes = () => {
    if (mode === 'prefix') {
      return selectedIndividuals.slice(0, 3).map((_, idx) => 
        `${prefix}${startNumber + idx}`
      );
    } else if (mode === 'template') {
      return selectedIndividuals.slice(0, 3).map((_, idx) => 
        template.replace('{n}', startNumber + idx)
      );
    } else if (mode === 'pattern') {
      const detected = detectPattern(pattern1, pattern2);
      if (detected) {
        return selectedIndividuals.slice(0, 3).map((_, idx) => 
          generateFromPattern(detected, idx)
        );
      }
    }
    return [];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bulk Rename Codes</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-gray-600">
            {selectedIndividuals.length} individuals selected
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="mode"
                  value="prefix"
                  checked={mode === 'prefix'}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="font-medium">Prefix + Auto Number</span>
              </label>
              {mode === 'prefix' && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="text-sm">Prefix</label>
                    <Input
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="ID-"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Start Number</label>
                    <Input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="mode"
                  value="template"
                  checked={mode === 'template'}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="font-medium">Custom Template</span>
              </label>
              {mode === 'template' && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="text-sm">Template (use {'{n}'} for number)</label>
                    <Input
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      placeholder="EXP1-{n}"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Start Number</label>
                    <Input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="mode"
                  value="pattern"
                  checked={mode === 'pattern'}
                  onChange={(e) => setMode(e.target.value)}
                />
                <span className="font-medium">Detect Pattern (Excel-like)</span>
              </label>
              {mode === 'pattern' && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="text-sm">First Value</label>
                    <Input
                      value={pattern1}
                      onChange={(e) => setPattern1(e.target.value)}
                      placeholder="ID-001"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Second Value</label>
                    <Input
                      value={pattern2}
                      onChange={(e) => setPattern2(e.target.value)}
                      placeholder="ID-002"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Enter two consecutive values to detect the pattern
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Preview (first 3):</div>
            <div className="bg-gray-50 rounded p-3 space-y-1 font-mono text-sm">
              {previewCodes().map((code, idx) => (
                <div key={idx}>{code}</div>
              ))}
              {selectedIndividuals.length > 3 && (
                <div className="text-gray-500">
                  ... and {selectedIndividuals.length - 3} more
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}