import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function MatrixLayout({ factors, onGenerate }) {
  const [rowFactors, setRowFactors] = useState([]);
  const [colFactors, setColFactors] = useState([]);
  const [cellCounts, setCellCounts] = useState({});
  const [defaultValue, setDefaultValue] = useState(50);
  const [showSummary, setShowSummary] = useState(false);
  const [specialCategories, setSpecialCategories] = useState([]);
  const [newSpecialName, setNewSpecialName] = useState('');
  const [newSpecialFactors, setNewSpecialFactors] = useState({});
  const [rowOrder, setRowOrder] = useState([]);

  useEffect(() => {
    if (factors.length > 0 && rowFactors.length === 0 && colFactors.length === 0) {
      // Default: all factors in rows except last one in columns
      if (factors.length === 1) {
        setRowFactors([factors[0].name]);
      } else {
        setRowFactors(factors.slice(0, -1).map(f => f.name));
        setColFactors([factors[factors.length - 1].name]);
      }
    }
  }, [factors]);

  const toggleFactorLocation = (factorName, location) => {
    if (location === 'row') {
      if (rowFactors.includes(factorName)) {
        setRowFactors(rowFactors.filter(f => f !== factorName));
      } else {
        setRowFactors([...rowFactors, factorName]);
        setColFactors(colFactors.filter(f => f !== factorName));
      }
    } else {
      if (colFactors.includes(factorName)) {
        setColFactors(colFactors.filter(f => f !== factorName));
      } else {
        setColFactors([...colFactors, factorName]);
        setRowFactors(rowFactors.filter(f => f !== factorName));
      }
    }
  };

  const generateCombinations = (factorNames, isSpecial = false, specialName = null) => {
    if (factorNames.length === 0) return [{ _isSpecial: isSpecial, _specialName: specialName }];
    
    const selectedFactors = factors.filter(f => factorNames.includes(f.name));
    const combinations = [];
    
    const generate = (index, current) => {
      if (index === selectedFactors.length) {
        combinations.push({ ...current, _isSpecial: isSpecial, _specialName: specialName });
        return;
      }
      const factor = selectedFactors[index];
      for (const level of factor.levels) {
        generate(index + 1, { ...current, [factor.name]: level });
      }
    };
    
    generate(0, {});
    return combinations;
  };

  const getNormalRowCombinations = () => {
    const combos = generateCombinations(rowFactors);
    return combos;
  };
  const getNormalColCombinations = () => generateCombinations(colFactors);
  
  const getSpecialRowCombinations = () => {
    const specials = [];
    specialCategories.forEach(special => {
      const enabledInRows = rowFactors.filter(rf => special.enabledFactors[rf]);
      const enabledInCols = colFactors.filter(cf => special.enabledFactors[cf]);
      
      // Only add to rows if it has enabled row factors OR if it only has column factors
      if (enabledInRows.length > 0 && enabledInCols.length === 0) {
        const combos = generateCombinations(enabledInRows, true, special.name);
        specials.push(...combos);
      } else if (enabledInRows.length === 0 && enabledInCols.length > 0) {
        // Add one row for this special category (will be split across columns)
        specials.push({ _isSpecial: true, _specialName: special.name });
      } else if (enabledInRows.length === 0 && enabledInCols.length === 0) {
        // No factors enabled - add one cell
        specials.push({ _isSpecial: true, _specialName: special.name });
      }
    });
    return specials;
  };

  const getSpecialColCombinations = () => {
    const specials = [];
    specialCategories.forEach(special => {
      const enabledInRows = rowFactors.filter(rf => special.enabledFactors[rf]);
      const enabledInCols = colFactors.filter(cf => special.enabledFactors[cf]);
      
      // Only add to columns if it has enabled column factors AND also has row factors
      if (enabledInCols.length > 0 && enabledInRows.length > 0) {
        const combos = generateCombinations(enabledInCols, true, special.name);
        specials.push(...combos);
      } else if (enabledInCols.length > 0 && enabledInRows.length === 0) {
        // Add to columns only
        const combos = generateCombinations(enabledInCols, true, special.name);
        specials.push(...combos);
      }
    });
    return specials;
  };

  const unorderedRowCombinations = [...getNormalRowCombinations(), ...getSpecialRowCombinations()];
  const colCombinations = [...getNormalColCombinations(), ...getSpecialColCombinations()];

  // Apply row ordering
  useEffect(() => {
    if (unorderedRowCombinations.length > 0 && rowOrder.length === 0) {
      setRowOrder(unorderedRowCombinations.map((_, idx) => idx));
    } else if (rowOrder.length !== unorderedRowCombinations.length) {
      setRowOrder(unorderedRowCombinations.map((_, idx) => idx));
    }
  }, [unorderedRowCombinations.length]);

  const rowCombinations = rowOrder.length === unorderedRowCombinations.length
    ? rowOrder.map(idx => unorderedRowCombinations[idx])
    : unorderedRowCombinations;

  const moveRowUp = (displayIndex) => {
    if (displayIndex > 0) {
      const newOrder = [...rowOrder];
      [newOrder[displayIndex], newOrder[displayIndex - 1]] = [newOrder[displayIndex - 1], newOrder[displayIndex]];
      setRowOrder(newOrder);
    }
  };

  const moveRowDown = (displayIndex) => {
    if (displayIndex < rowOrder.length - 1) {
      const newOrder = [...rowOrder];
      [newOrder[displayIndex], newOrder[displayIndex + 1]] = [newOrder[displayIndex + 1], newOrder[displayIndex]];
      setRowOrder(newOrder);
    }
  };

  const getCellKey = (rowCombo, colCombo) => {
    return JSON.stringify({ ...rowCombo, ...colCombo });
  };

  const getCellValue = (rowCombo, colCombo) => {
    const key = getCellKey(rowCombo, colCombo);
    return cellCounts[key] || 0;
  };

  const setCellValue = (rowCombo, colCombo, value) => {
    const key = getCellKey(rowCombo, colCombo);
    setCellCounts({ ...cellCounts, [key]: parseInt(value) || 0 });
  };

  const fillAll = () => {
    const newCounts = {};
    rowCombinations.forEach(rowCombo => {
      colCombinations.forEach(colCombo => {
        const key = getCellKey(rowCombo, colCombo);
        newCounts[key] = defaultValue;
      });
    });
    setCellCounts(newCounts);
  };

  const fillRow = (rowIndex) => {
    const newCounts = { ...cellCounts };
    const rowCombo = rowCombinations[rowIndex];
    colCombinations.forEach(colCombo => {
      const key = getCellKey(rowCombo, colCombo);
      newCounts[key] = defaultValue;
    });
    setCellCounts(newCounts);
  };

  const fillColumn = (colIndex) => {
    const newCounts = { ...cellCounts };
    const colCombo = colCombinations[colIndex];
    rowCombinations.forEach(rowCombo => {
      const key = getCellKey(rowCombo, colCombo);
      newCounts[key] = defaultValue;
    });
    setCellCounts(newCounts);
  };

  const handleGenerate = () => {
    const categories = [];
    rowCombinations.forEach(rowCombo => {
      colCombinations.forEach(colCombo => {
        const count = getCellValue(rowCombo, colCombo);
        if (count > 0) {
          const combination = { ...rowCombo, ...colCombo };
          // Clean up metadata keys
          const { _isSpecial, _specialName, ...cleanCombo } = combination;
          const isSpecial = rowCombo._isSpecial || colCombo._isSpecial;
          const specialName = rowCombo._specialName || colCombo._specialName;
          
          categories.push({ 
            combination: cleanCombo, 
            count,
            isSpecial,
            specialName
          });
        }
      });
    });
    onGenerate(categories);
  };

  const addSpecialCategory = () => {
    if (!newSpecialName.trim()) return;
    setSpecialCategories([...specialCategories, {
      name: newSpecialName,
      enabledFactors: newSpecialFactors
    }]);
    setNewSpecialName('');
    setNewSpecialFactors({});
  };

  const removeSpecialCategory = (index) => {
    setSpecialCategories(specialCategories.filter((_, i) => i !== index));
  };

  const toggleSpecialFactor = (factorName) => {
    setNewSpecialFactors({
      ...newSpecialFactors,
      [factorName]: !newSpecialFactors[factorName]
    });
  };

  const formatComboLabel = (combo) => {
    const entries = Object.entries(combo).filter(([k]) => !k.startsWith('_'));
    if (combo._isSpecial) {
      if (entries.length === 0) {
        return `[${combo._specialName}]`;
      }
      return `[${combo._specialName}] ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`;
    }
    return entries.map(([k, v]) => `${k}=${v}`).join(', ');
  };

  const calculateRowTotals = () => {
    return rowCombinations.map((rowCombo, idx) => {
      const total = colCombinations.reduce((sum, colCombo) => {
        return sum + getCellValue(rowCombo, colCombo);
      }, 0);
      return { combo: rowCombo, total };
    });
  };

  const calculateColumnTotals = () => {
    return colCombinations.map((colCombo, idx) => {
      const total = rowCombinations.reduce((sum, rowCombo) => {
        return sum + getCellValue(rowCombo, colCombo);
      }, 0);
      return { combo: colCombo, total };
    });
  };

  if (factors.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Matrix Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select factors for rows and columns</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded p-3">
                  <h4 className="font-semibold mb-2">Row Factors</h4>
                  {factors.map(factor => (
                    <label key={factor.name} className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={rowFactors.includes(factor.name)}
                        onChange={() => toggleFactorLocation(factor.name, 'row')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{factor.name}</span>
                    </label>
                  ))}
                </div>
                <div className="border rounded p-3">
                  <h4 className="font-semibold mb-2">Column Factors</h4>
                  {factors.map(factor => (
                    <label key={factor.name} className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={colFactors.includes(factor.name)}
                        onChange={() => toggleFactorLocation(factor.name, 'col')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{factor.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Default individuals per cell</Label>
                <Input
                  type="number"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
              <Button onClick={fillAll}>Fill ALL cells</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Special Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={newSpecialName}
                onChange={(e) => setNewSpecialName(e.target.value)}
                placeholder="e.g., Control"
              />
            </div>
            
            <div>
              <Label className="block mb-2">Factor Toggles (ON = split by this factor)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {factors.map(factor => (
                  <label key={factor.name} className="flex items-center gap-2 border rounded p-2">
                    <input
                      type="checkbox"
                      checked={newSpecialFactors[factor.name] || false}
                      onChange={() => toggleSpecialFactor(factor.name)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{factor.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {newSpecialFactors[factor.name] ? 'ON' : 'OFF'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={addSpecialCategory} disabled={!newSpecialName.trim()}>
              Add Special Category
            </Button>

            {specialCategories.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Created Special Categories</Label>
                {specialCategories.map((special, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                    <div>
                      <span className="font-semibold">{special.name}</span>
                      <div className="text-xs text-gray-600 mt-1">
                        ON: {Object.entries(special.enabledFactors)
                          .filter(([_, enabled]) => enabled)
                          .map(([name]) => name)
                          .join(', ') || 'None'}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeSpecialCategory(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {rowFactors.length > 0 && colFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Counts Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="border-collapse border w-full text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-100 font-semibold sticky left-0 bg-gray-100 z-10">
                      <div className="flex items-center gap-2">
                        <span>⬍</span>
                        <span>{rowFactors.join(' / ')}</span>
                      </div>
                    </th>
                    {colCombinations.map((colCombo, idx) => (
                      <th key={idx} className={`border p-2 ${colCombo._isSpecial ? 'bg-blue-100' : 'bg-gray-50'}`}>
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                          <span className="font-medium">{formatComboLabel(colCombo)}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => fillColumn(idx)}
                            className="text-xs"
                          >
                            Fill col
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowCombinations.map((rowCombo, rowIdx) => (
                    <tr key={rowIdx} className={rowCombo._isSpecial ? 'bg-blue-50' : ''}>
                      <td className={`border p-2 font-medium sticky left-0 z-10 ${rowCombo._isSpecial ? 'bg-blue-100' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveRowUp(rowIdx)}
                                disabled={rowIdx === 0}
                                className="h-4 w-4 p-0"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveRowDown(rowIdx)}
                                disabled={rowIdx === rowCombinations.length - 1}
                                className="h-4 w-4 p-0"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm">{formatComboLabel(rowCombo)}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => fillRow(rowIdx)}
                            className="text-xs"
                          >
                            Fill row
                          </Button>
                        </div>
                      </td>
                      {colCombinations.map((colCombo, colIdx) => (
                        <td key={colIdx} className="border p-2">
                          <Input
                            type="number"
                            value={getCellValue(rowCombo, colCombo)}
                            onChange={(e) => setCellValue(rowCombo, colCombo, e.target.value)}
                            min="0"
                            className="w-full"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total cells: {rowCombinations.length * colCombinations.length} | 
                Total individuals: {Object.values(cellCounts).reduce((sum, val) => sum + (val || 0), 0)}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowSummary(!showSummary)} variant="outline">
                  {showSummary ? 'Hide' : 'Show'} Summary
                </Button>
                <Button onClick={handleGenerate} size="lg">
                  Generate All Individuals
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showSummary && rowFactors.length > 0 && colFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matrix Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Total per Row</h3>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b p-2 text-left">Row Category</th>
                        <th className="border-b p-2 text-right">Total Individuals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateRowTotals().map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border-b p-2 font-mono text-xs">
                            {formatComboLabel(row.combo)}
                          </td>
                          <td className="border-b p-2 text-right font-semibold">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right">
                          {calculateRowTotals().reduce((sum, r) => sum + r.total, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Total per Column</h3>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border-b p-2 text-left">Column Category</th>
                        <th className="border-b p-2 text-right">Total Individuals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateColumnTotals().map((col, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border-b p-2 font-mono text-xs">
                            {formatComboLabel(col.combo)}
                          </td>
                          <td className="border-b p-2 text-right font-semibold">
                            {col.total}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right">
                          {calculateColumnTotals().reduce((sum, c) => sum + c.total, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}