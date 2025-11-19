import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function MatrixLayout({ factors, onGenerate }) {
  const [rowFactors, setRowFactors] = useState([]);
  const [colFactors, setColFactors] = useState([]);
  const [cellCounts, setCellCounts] = useState({});
  const [defaultValue, setDefaultValue] = useState(50);

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

  const generateCombinations = (factorNames) => {
    if (factorNames.length === 0) return [{}];
    
    const selectedFactors = factors.filter(f => factorNames.includes(f.name));
    const combinations = [];
    
    const generate = (index, current) => {
      if (index === selectedFactors.length) {
        combinations.push({ ...current });
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

  const rowCombinations = generateCombinations(rowFactors);
  const colCombinations = generateCombinations(colFactors);

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

  const calculateRowTotal = (rowCombo) => {
    let total = 0;
    colCombinations.forEach(colCombo => {
      total += getCellValue(rowCombo, colCombo);
    });
    return total;
  };

  const calculateColumnTotal = (colCombo) => {
    let total = 0;
    rowCombinations.forEach(rowCombo => {
      total += getCellValue(rowCombo, colCombo);
    });
    return total;
  };

  const calculateGrandTotal = () => {
    let total = 0;
    rowCombinations.forEach(rowCombo => {
      colCombinations.forEach(colCombo => {
        total += getCellValue(rowCombo, colCombo);
      });
    });
    return total;
  };

  const handleGenerate = () => {
    const categories = [];
    rowCombinations.forEach(rowCombo => {
      colCombinations.forEach(colCombo => {
        const combination = { ...rowCombo, ...colCombo };
        const count = getCellValue(rowCombo, colCombo);
        if (count > 0) {
          categories.push({ combination, count });
        }
      });
    });
    onGenerate(categories);
  };

  const formatComboLabel = (combo) => {
    return Object.entries(combo)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
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

      {rowFactors.length > 0 && colFactors.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-3">Row Totals</h4>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2 border-b">Row category</th>
                          <th className="text-right p-2 border-b">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowCombinations.map((rowCombo, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="p-2">{formatComboLabel(rowCombo)}</td>
                            <td className="p-2 text-right font-medium">{calculateRowTotal(rowCombo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Column Totals</h4>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2 border-b">Column category</th>
                          <th className="text-right p-2 border-b">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colCombinations.map((colCombo, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="p-2">{formatComboLabel(colCombo)}</td>
                            <td className="p-2 text-right font-medium">{calculateColumnTotal(colCombo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total individuals in this experiment (planned):</span>
                  <span className="text-2xl font-bold text-blue-600">{calculateGrandTotal()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      {rowFactors.join(' / ')}
                    </th>
                    {colCombinations.map((colCombo, idx) => (
                      <th key={idx} className="border p-2 bg-gray-50">
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
                    <tr key={rowIdx}>
                      <td className="border p-2 bg-gray-50 font-medium sticky left-0 bg-gray-50 z-10">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm">{formatComboLabel(rowCombo)}</span>
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

            <div className="mt-6 flex justify-end">
              <Button onClick={handleGenerate} size="lg">
                Generate All Individuals
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}