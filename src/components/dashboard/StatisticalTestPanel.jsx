import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, X, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StatisticalTestPanel({ selectedBars, onClear, chartType }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState("auto");
  const [correctionMethod, setCorrectionMethod] = useState("fdr");

  const runTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      const prompt = `You are a biostatistician. Perform statistical testing on the following data:

Selected groups: ${selectedBars.map(b => b.name).join(", ")}

Data:
${selectedBars.map(b => `- ${b.name}: ${JSON.stringify(b.data)}`).join("\n")}

Test type requested: ${testType}
Correction method: ${correctionMethod}

Instructions:
${selectedBars.length === 2 ? `
1. Compare these two groups
2. If test type is "auto": Use Fisher's exact test if any expected count < 5, otherwise use two-sample proportion z-test
3. If test type is specified, use that test
4. Calculate: p-value, test statistic, effect size (difference in proportions, odds ratio), 95% CI
5. Return raw counts and proportions for each group
` : `
1. Build a contingency table from all groups
2. Run chi-square test of independence (or Fisher-Freeman-Halton if expected counts < 5)
3. If significant (p < 0.05), run pairwise comparisons between ALL pairs
4. Apply ${correctionMethod} correction to pairwise p-values
5. Calculate effect sizes for each pair
`}

Return your response in the following JSON format:
{
  "global_test": {
    "test_name": "string",
    "statistic": number,
    "p_value": number,
    "significant": boolean,
    "warnings": ["string"] (if any assumptions violated)
  },
  "groups": [
    {
      "name": "string",
      "count": number,
      "total": number,
      "proportion": number
    }
  ],
  "pairwise": [
    {
      "group1": "string",
      "group2": "string",
      "test_name": "string",
      "p_value": number,
      "p_value_corrected": number,
      "effect_size": number,
      "ci_lower": number,
      "ci_upper": number,
      "interpretation": "string"
    }
  ] (only if >2 groups and global test is significant)
}

Be precise with calculations. Use standard statistical formulas.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            global_test: {
              type: "object",
              properties: {
                test_name: { type: "string" },
                statistic: { type: "number" },
                p_value: { type: "number" },
                significant: { type: "boolean" },
                warnings: { type: "array", items: { type: "string" } }
              }
            },
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  count: { type: "number" },
                  total: { type: "number" },
                  proportion: { type: "number" }
                }
              }
            },
            pairwise: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  group1: { type: "string" },
                  group2: { type: "string" },
                  test_name: { type: "string" },
                  p_value: { type: "number" },
                  p_value_corrected: { type: "number" },
                  effect_size: { type: "number" },
                  ci_lower: { type: "number" },
                  ci_upper: { type: "number" },
                  interpretation: { type: "string" }
                }
              }
            }
          }
        }
      });

      setResults(response);
    } catch (error) {
      alert("Test failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (selectedBars.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-blue-800">
            Statistical Testing ({selectedBars.length} groups selected)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded p-3">
          <p className="text-sm font-medium mb-2">Selected Groups:</p>
          <div className="flex flex-wrap gap-2">
            {selectedBars.map((bar, idx) => (
              <div key={idx} className="px-3 py-1 bg-blue-100 rounded text-sm">
                {bar.name}
              </div>
            ))}
          </div>
        </div>

        {!results && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Test Type</label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (recommended)</SelectItem>
                  <SelectItem value="fisher">Fisher's Exact</SelectItem>
                  <SelectItem value="chi-square">Chi-Square</SelectItem>
                  <SelectItem value="z-test">Z-Test (2 groups only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedBars.length > 2 && (
              <div>
                <label className="text-sm font-medium block mb-1">Correction Method</label>
                <Select value={correctionMethod} onValueChange={setCorrectionMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fdr">FDR (Benjamini-Hochberg)</SelectItem>
                    <SelectItem value="bonferroni">Bonferroni</SelectItem>
                    <SelectItem value="holm">Holm</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {!results ? (
          <Button onClick={runTest} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running statistical test...
              </>
            ) : (
              "Run Statistical Test"
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded p-4">
              <h3 className="font-semibold text-lg mb-3">
                {results.global_test.test_name}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-gray-600">Test Statistic</p>
                  <p className="text-xl font-bold">
                    {results.global_test.statistic?.toFixed(4) || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">P-value</p>
                  <p className={`text-xl font-bold ${results.global_test.p_value < 0.05 ? "text-red-600" : "text-gray-900"}`}>
                    {results.global_test.p_value?.toFixed(6) || "N/A"}
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded ${results.global_test.significant ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-800"}`}>
                {results.global_test.significant ? "✓ Statistically significant (p < 0.05)" : "Not significant (p ≥ 0.05)"}
              </div>

              {results.global_test.warnings && results.global_test.warnings.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    {results.global_test.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {results.groups && (
              <div className="bg-white rounded p-4">
                <h4 className="font-semibold mb-3">Group Summary</h4>
                <div className="space-y-2">
                  {results.groups.map((group, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-gray-600">
                        {group.count}/{group.total} ({(group.proportion * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.pairwise && results.pairwise.length > 0 && (
              <div className="bg-white rounded p-4">
                <h4 className="font-semibold mb-3">Pairwise Comparisons</h4>
                <div className="space-y-3">
                  {results.pairwise.map((pair, idx) => (
                    <div key={idx} className="border-l-4 border-blue-400 pl-3 py-2 bg-gray-50">
                      <p className="font-medium text-sm mb-1">
                        {pair.group1} vs {pair.group2}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600">p-value (raw): </span>
                          <span className="font-semibold">{pair.p_value?.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">p-value (adj): </span>
                          <span className={`font-semibold ${pair.p_value_corrected < 0.05 ? "text-red-600" : ""}`}>
                            {pair.p_value_corrected?.toFixed(4)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Effect size: </span>
                          <span className="font-semibold">
                            {pair.effect_size?.toFixed(4)} [95% CI: {pair.ci_lower?.toFixed(4)}, {pair.ci_upper?.toFixed(4)}]
                          </span>
                        </div>
                        {pair.interpretation && (
                          <div className="col-span-2 text-gray-600">
                            {pair.interpretation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" onClick={() => setResults(null)} className="w-full">
              Run Another Test
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}