import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function BulkRenameDialog({ open, onClose, selectedIndividuals, onRename }) {
  const [mode, setMode] = useState("prefix");
  const [prefix, setPrefix] = useState("ID-");
  const [startNumber, setStartNumber] = useState(1);
  const [template, setTemplate] = useState("EXP1-{n}");
  const [firstCode, setFirstCode] = useState("");
  const [secondCode, setSecondCode] = useState("");

  const handleRename = () => {
    let newCodes = [];

    if (mode === "prefix") {
      newCodes = selectedIndividuals.map((_, idx) => `${prefix}${startNumber + idx}`);
    } else if (mode === "template") {
      newCodes = selectedIndividuals.map((_, idx) => template.replace("{n}", startNumber + idx));
    } else if (mode === "pattern") {
      const pattern = detectPattern(firstCode, secondCode);
      if (!pattern) {
        alert("Could not detect pattern. Please check the first two codes.");
        return;
      }
      newCodes = generateFromPattern(pattern, selectedIndividuals.length);
    }

    onRename(newCodes);
    onClose();
  };

  const detectPattern = (first, second) => {
    if (!first || !second) return null;

    const firstMatch = first.match(/^(.*?)(\d+)(.*)$/);
    const secondMatch = second.match(/^(.*?)(\d+)(.*)$/);

    if (!firstMatch || !secondMatch) return null;

    const [, prefix1, num1, suffix1] = firstMatch;
    const [, prefix2, num2, suffix2] = secondMatch;

    if (prefix1 === prefix2 && suffix1 === suffix2) {
      const increment = parseInt(num2) - parseInt(num1);
      return {
        prefix: prefix1,
        suffix: suffix1,
        startNum: parseInt(num1),
        increment: increment,
        numDigits: num1.length
      };
    }

    return null;
  };

  const generateFromPattern = (pattern, count) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const num = pattern.startNum + (i * pattern.increment);
      const paddedNum = String(num).padStart(pattern.numDigits, '0');
      codes.push(`${pattern.prefix}${paddedNum}${pattern.suffix}`);
    }
    return codes;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Rename Codes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600 mb-4">
            {selectedIndividuals.length} individuals selected
          </div>

          <RadioGroup value={mode} onValueChange={setMode}>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="prefix" id="prefix" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="prefix" className="font-medium cursor-pointer">
                    Prefix + Numbering
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Prefix</Label>
                      <Input
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="ID-"
                        disabled={mode !== "prefix"}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Start Number</Label>
                      <Input
                        type="number"
                        value={startNumber}
                        onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                        disabled={mode !== "prefix"}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Example: {prefix}{startNumber}, {prefix}{startNumber + 1}, {prefix}{startNumber + 2}...
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="template" id="template" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="template" className="font-medium cursor-pointer">
                    Custom Template
                  </Label>
                  <div className="space-y-2">
                    <Input
                      value={template}
                      onChange={(e) => setTemplate(e.target.value)}
                      placeholder="EXP1-{n}"
                      disabled={mode !== "template"}
                    />
                    <div className="text-xs text-gray-500">
                      Use {"{n}"} for number. Example: {template.replace("{n}", startNumber)}, {template.replace("{n}", startNumber + 1)}...
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                <RadioGroupItem value="pattern" id="pattern" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="pattern" className="font-medium cursor-pointer">
                    Auto-detect Pattern
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">First Code</Label>
                      <Input
                        value={firstCode}
                        onChange={(e) => setFirstCode(e.target.value)}
                        placeholder="A-01"
                        disabled={mode !== "pattern"}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Second Code</Label>
                      <Input
                        value={secondCode}
                        onChange={(e) => setSecondCode(e.target.value)}
                        placeholder="A-02"
                        disabled={mode !== "pattern"}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Enter first two codes to detect pattern
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleRename}>
            Rename Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}