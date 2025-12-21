// Statistical utility functions for consistent calculations

// Chi-square test for contingency tables
export function chiSquareTest(observed) {
  const rowSums = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = observed[0].map((_, colIdx) => 
    observed.reduce((sum, row) => sum + row[colIdx], 0)
  );
  const total = rowSums.reduce((a, b) => a + b, 0);

  // Calculate expected frequencies
  const expected = observed.map((row, i) => 
    row.map((_, j) => (rowSums[i] * colSums[j]) / total)
  );

  // Check if any expected frequency is < 5
  const minExpected = Math.min(...expected.flat());
  const warnings = [];
  if (minExpected < 5) {
    warnings.push(`Warning: Minimum expected frequency is ${minExpected.toFixed(2)} (< 5). Consider using Fisher's exact test.`);
  }

  // Calculate chi-square statistic
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      const diff = observed[i][j] - expected[i][j];
      chiSquare += (diff * diff) / expected[i][j];
    }
  }

  // Degrees of freedom
  const df = (observed.length - 1) * (observed[0].length - 1);

  // Calculate p-value using chi-square distribution
  const pValue = 1 - chiSquareCDF(chiSquare, df);

  return {
    statistic: chiSquare,
    pValue,
    df,
    warnings,
    expected
  };
}

// Fisher's exact test for 2x2 tables
export function fisherExactTest(a, b, c, d) {
  // a, b = counts in group 1 (success, failure)
  // c, d = counts in group 2 (success, failure)
  
  const n1 = a + b;
  const n2 = c + d;
  const k = a + c;
  const n = n1 + n2;

  // Calculate exact p-value (two-tailed)
  const observedProb = hypergeometric(a, n, k, n1);
  
  let pValue = 0;
  for (let x = 0; x <= Math.min(n1, k); x++) {
    const prob = hypergeometric(x, n, k, n1);
    if (prob <= observedProb + 1e-10) {
      pValue += prob;
    }
  }

  // Odds ratio
  const oddsRatio = (a * d) / (b * c);

  return {
    statistic: oddsRatio,
    pValue: Math.min(pValue, 1),
    oddsRatio
  };
}

// Two-sample Z-test for proportions
export function zTestProportions(x1, n1, x2, n2) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPooled = (x1 + x2) / (n1 + n2);
  
  // Standard error under null hypothesis
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));
  
  // Z statistic
  const z = (p1 - p2) / se;
  
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // 95% CI for difference in proportions
  const seDiff = Math.sqrt(p1*(1-p1)/n1 + p2*(1-p2)/n2);
  const ciLower = (p1 - p2) - 1.96 * seDiff;
  const ciUpper = (p1 - p2) + 1.96 * seDiff;
  
  return {
    statistic: z,
    pValue,
    p1,
    p2,
    difference: p1 - p2,
    ciLower,
    ciUpper
  };
}

// Multiple testing corrections
export function correctPValues(pValues, method = 'fdr') {
  const n = pValues.length;
  const indices = pValues.map((_, i) => i);
  
  if (method === 'bonferroni') {
    return pValues.map(p => Math.min(p * n, 1));
  }
  
  if (method === 'holm') {
    // Sort p-values
    const sorted = indices.sort((a, b) => pValues[a] - pValues[b]);
    const corrected = new Array(n);
    
    for (let i = 0; i < n; i++) {
      const idx = sorted[i];
      corrected[idx] = Math.min(pValues[idx] * (n - i), 1);
    }
    
    // Enforce monotonicity
    for (let i = 1; i < n; i++) {
      const idx = sorted[i];
      const prevIdx = sorted[i - 1];
      corrected[idx] = Math.max(corrected[idx], corrected[prevIdx]);
    }
    
    return corrected;
  }
  
  if (method === 'fdr') {
    // Benjamini-Hochberg procedure
    const sorted = indices.sort((a, b) => pValues[a] - pValues[b]);
    const corrected = new Array(n);
    
    for (let i = n - 1; i >= 0; i--) {
      const idx = sorted[i];
      const rank = i + 1;
      corrected[idx] = Math.min(pValues[idx] * n / rank, 1);
    }
    
    // Enforce monotonicity
    for (let i = n - 2; i >= 0; i--) {
      const idx = sorted[i];
      const nextIdx = sorted[i + 1];
      corrected[idx] = Math.min(corrected[idx], corrected[nextIdx]);
    }
    
    return corrected;
  }
  
  return pValues; // 'none'
}

// Helper: Chi-square CDF approximation
function chiSquareCDF(x, df) {
  if (x <= 0) return 0;
  if (df === 1) {
    return 2 * normalCDF(Math.sqrt(x)) - 1;
  }
  
  // Use incomplete gamma function approximation
  return incompleteGamma(df / 2, x / 2) / gamma(df / 2);
}

// Helper: Normal CDF (standard normal)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// Helper: Factorial
function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Helper: Log factorial (for large numbers)
function logFactorial(n) {
  if (n <= 1) return 0;
  let sum = 0;
  for (let i = 2; i <= n; i++) sum += Math.log(i);
  return sum;
}

// Helper: Binomial coefficient
function binomialCoeff(n, k) {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // Use log to avoid overflow
  const logResult = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return Math.exp(logResult);
}

// Helper: Hypergeometric probability
function hypergeometric(x, N, K, n) {
  // P(X = x) where we draw n items from N items containing K successes
  if (x < 0 || x > n || x > K || n - x > N - K) return 0;
  
  const logProb = 
    logFactorial(K) - logFactorial(x) - logFactorial(K - x) +
    logFactorial(N - K) - logFactorial(n - x) - logFactorial(N - K - n + x) -
    (logFactorial(N) - logFactorial(n) - logFactorial(N - n));
  
  return Math.exp(logProb);
}

// Helper: Gamma function approximation (Stirling)
function gamma(z) {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// Helper: Incomplete gamma function (lower)
function incompleteGamma(s, x) {
  if (x <= 0) return 0;
  if (x < s + 1) {
    // Use series representation
    let sum = 1 / s;
    let term = 1 / s;
    for (let n = 1; n < 100; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < 1e-10) break;
    }
    return sum * Math.exp(-x + s * Math.log(x));
  } else {
    // Use continued fraction
    let a = 1 - s;
    let b = a + x + 1;
    let term = 0;
    let pn = [0, 1, x, x + 1];
    let qn = [1, x, x * b + a, x * x * b + (a + 1) * x + a];
    
    for (let n = 2; n < 100; n++) {
      const an = (n - 1) * (s - n + 1);
      const bn = b + 2 * (n - 1);
      
      const pnew = bn * pn[1] + an * pn[0];
      const qnew = bn * qn[1] + an * qn[0];
      
      if (qnew !== 0) {
        const ratio = pnew / qnew;
        if (Math.abs((ratio - term) / ratio) < 1e-10) {
          return gamma(s) - Math.exp(-x + s * Math.log(x)) * ratio;
        }
        term = ratio;
      }
      
      pn = [pn[1], pnew];
      qn = [qn[1], qnew];
    }
    
    return gamma(s) - Math.exp(-x + s * Math.log(x)) * term;
  }
}

// One-way ANOVA
export function oneWayAnova(groups) {
  // groups is an object: { groupName: [values...] }
  const groupNames = Object.keys(groups);
  const allValues = [];
  
  groupNames.forEach(name => {
    allValues.push(...groups[name]);
  });
  
  const N = allValues.length;
  const k = groupNames.length;
  
  if (N <= k) {
    throw new Error('Not enough data points for ANOVA');
  }
  
  // Grand mean
  const grandMean = allValues.reduce((a, b) => a + b, 0) / N;
  
  // Between-group sum of squares
  let ssBetween = 0;
  groupNames.forEach(name => {
    const groupMean = groups[name].reduce((a, b) => a + b, 0) / groups[name].length;
    ssBetween += groups[name].length * Math.pow(groupMean - grandMean, 2);
  });
  
  // Within-group sum of squares
  let ssWithin = 0;
  groupNames.forEach(name => {
    const groupMean = groups[name].reduce((a, b) => a + b, 0) / groups[name].length;
    groups[name].forEach(value => {
      ssWithin += Math.pow(value - groupMean, 2);
    });
  });
  
  // Degrees of freedom
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  // Mean squares
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / (dfWithin || 1);
  
  // F-statistic
  const fStat = msWithin > 0 ? msBetween / msWithin : 0;
  
  // P-value (F-distribution CDF)
  let pValue = 0.5;
  if (fStat > 0 && isFinite(fStat)) {
    pValue = 1 - fCDF(fStat, dfBetween, dfWithin);
    // Safety check
    if (!isFinite(pValue) || pValue < 0 || pValue > 1) {
      pValue = fStat > 10 ? 0.001 : 0.5;
    }
  }
  
  // Effect size (eta-squared)
  const etaSquared = ssBetween / (ssBetween + ssWithin);
  
  // Group statistics
  const groupStats = groupNames.map(name => {
    const values = groups[name];
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1 || 1);
    const std = Math.sqrt(variance);
    
    return { name, n, mean, std };
  });
  
  return {
    f_statistic: fStat,
    p_value: pValue,
    df_between: dfBetween,
    df_within: dfWithin,
    eta_squared: etaSquared,
    significant: pValue < 0.05,
    group_stats: groupStats,
    ms_within: msWithin
  };
}

// Tukey HSD post-hoc test
export function tukeyHSD(groups, msWithin, dfWithin) {
  const groupNames = Object.keys(groups);
  const comparisons = [];
  
  // Calculate group means
  const groupMeans = {};
  groupNames.forEach(name => {
    groupMeans[name] = groups[name].reduce((a, b) => a + b, 0) / groups[name].length;
  });
  
  // All pairwise comparisons
  for (let i = 0; i < groupNames.length; i++) {
    for (let j = i + 1; j < groupNames.length; j++) {
      const g1 = groupNames[i];
      const g2 = groupNames[j];
      
      const mean1 = groupMeans[g1];
      const mean2 = groupMeans[g2];
      const n1 = groups[g1].length;
      const n2 = groups[g2].length;
      
      // Mean difference
      const meanDiff = mean1 - mean2;
      
      // Standard error
      const se = Math.sqrt(msWithin * (1/n1 + 1/n2));
      
      // Studentized range statistic (q)
      const q = Math.abs(meanDiff) / se;
      
      // Approximate p-value using Tukey distribution
      const pValue = 1 - tukeyQCDF(q, groupNames.length, dfWithin);
      
      comparisons.push({
        group1: g1,
        group2: g2,
        mean_diff: meanDiff,
        p_value: pValue,
        significant: pValue < 0.05
      });
    }
  }
  
  return comparisons;
}

// Helper: F-distribution CDF
function fCDF(x, df1, df2) {
  if (x <= 0) return 0;
  if (!isFinite(x) || !isFinite(df1) || !isFinite(df2)) return 0.5;
  
  // Use beta distribution relationship
  const y = (df1 * x) / (df1 * x + df2);
  
  // Direct incomplete beta calculation to avoid division
  const result = incompleteBetaFunc(y, df1/2, df2/2);
  
  return result;
}

// Helper: Beta function
function beta(a, b) {
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return 1;
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

// Helper: Incomplete beta function (different name to avoid conflict)
function incompleteBetaFunc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  // Avoid numerical issues
  if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return 0.5;
  
  // Use symmetry relation if needed
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBetaFunc(1 - x, b, a);
  }
  
  // Compute using continued fraction
  const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const logPrefix = a * Math.log(x) + b * Math.log(1 - x) - logBeta;
  
  if (!isFinite(logPrefix)) return 0.5;
  
  const prefix = Math.exp(logPrefix);
  
  // Lentz's algorithm for continued fraction
  let f = 1.0;
  let c = 1.0;
  let d = 0.0;
  
  for (let m = 0; m <= 200; m++) {
    const m2 = 2 * m;
    let numerator;
    
    if (m === 0) {
      numerator = 1.0;
    } else if (m % 2 === 1) {
      const mm = (m - 1) / 2;
      numerator = -((a + mm) * (a + b + mm) * x) / ((a + m2 - 1) * (a + m2));
    } else {
      const mm = m / 2;
      numerator = (mm * (b - mm) * x) / ((a + m2 - 2) * (a + m2 - 1));
    }
    
    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1.0 / d;
    
    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    
    const delta = c * d;
    f *= delta;
    
    if (Math.abs(delta - 1.0) < 1e-10) {
      break;
    }
  }
  
  return prefix * f / a;
}

// Helper: Tukey Q distribution CDF (approximation)
function tukeyQCDF(q, k, df) {
  // Approximation using normal distribution
  const sqrtDf = Math.sqrt(df);
  const z = (q * sqrtDf - Math.sqrt(k)) / Math.sqrt(2);
  return Math.pow(normalCDF(z), k);
}

// Log gamma function
function logGamma(x) {
  if (x <= 0) return Infinity;
  return Math.log(gamma(x));
}

// Multi-way ANOVA (supports up to 3-way with interactions)
export function multiWayAnova(data, factorNames) {
  // data: array of objects with factor values and response value
  // e.g., [{factor1: 'A', factor2: 'B', value: 10}, ...]
  
  const n = data.length;
  const grandMean = data.reduce((sum, d) => sum + d.value, 0) / n;
  
  // Calculate total sum of squares
  const ssTotal = data.reduce((sum, d) => sum + Math.pow(d.value - grandMean, 2), 0);
  
  // Main effects and interactions
  const effects = [];
  
  // Single factors (main effects)
  factorNames.forEach(factor => {
    const groups = {};
    data.forEach(d => {
      const level = d[factor];
      if (!groups[level]) groups[level] = [];
      groups[level].push(d.value);
    });
    
    const levelNames = Object.keys(groups);
    let ss = 0;
    levelNames.forEach(level => {
      const values = groups[level];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      ss += values.length * Math.pow(mean - grandMean, 2);
    });
    
    const df = levelNames.length - 1;
    const ms = ss / df;
    
    effects.push({
      factor,
      ss,
      df,
      ms,
      type: 'main'
    });
  });
  
  // Two-way interactions
  if (factorNames.length >= 2) {
    for (let i = 0; i < factorNames.length; i++) {
      for (let j = i + 1; j < factorNames.length; j++) {
        const f1 = factorNames[i];
        const f2 = factorNames[j];
        
        const groups = {};
        data.forEach(d => {
          const key = `${d[f1]}|${d[f2]}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(d.value);
        });
        
        // Calculate interaction SS
        let ss = 0;
        Object.entries(groups).forEach(([key, values]) => {
          const [lev1, lev2] = key.split('|');
          const cellMean = values.reduce((a, b) => a + b, 0) / values.length;
          
          // Get marginal means
          const margin1 = data.filter(d => d[f1] === lev1);
          const mean1 = margin1.reduce((a, b) => a + b.value, 0) / margin1.length;
          
          const margin2 = data.filter(d => d[f2] === lev2);
          const mean2 = margin2.reduce((a, b) => a + b.value, 0) / margin2.length;
          
          ss += values.length * Math.pow(cellMean - mean1 - mean2 + grandMean, 2);
        });
        
        const levels1 = [...new Set(data.map(d => d[f1]))].length;
        const levels2 = [...new Set(data.map(d => d[f2]))].length;
        const df = (levels1 - 1) * (levels2 - 1);
        const ms = ss / df;
        
        effects.push({
          factors: [f1, f2],
          ss,
          df,
          ms,
          type: 'interaction'
        });
      }
    }
  }
  
  // Three-way interaction
  if (factorNames.length === 3) {
    const [f1, f2, f3] = factorNames;
    const groups = {};
    
    data.forEach(d => {
      const key = `${d[f1]}|${d[f2]}|${d[f3]}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d.value);
    });
    
    // Simplified 3-way interaction calculation
    let ss = 0;
    Object.values(groups).forEach(values => {
      const cellMean = values.reduce((a, b) => a + b, 0) / values.length;
      ss += values.length * Math.pow(cellMean - grandMean, 2);
    });
    
    // Subtract main effects and 2-way interactions
    effects.forEach(effect => {
      if (effect.type === 'main' || effect.type === 'interaction') {
        ss -= effect.ss;
      }
    });
    
    const levels1 = [...new Set(data.map(d => d[f1]))].length;
    const levels2 = [...new Set(data.map(d => d[f2]))].length;
    const levels3 = [...new Set(data.map(d => d[f3]))].length;
    const df = (levels1 - 1) * (levels2 - 1) * (levels3 - 1);
    const ms = df > 0 ? ss / df : 0;
    
    if (df > 0) {
      effects.push({
        factors: [f1, f2, f3],
        ss,
        df,
        ms,
        type: 'interaction'
      });
    }
  }
  
  // Error (within-groups) sum of squares
  let ssError = ssTotal;
  effects.forEach(effect => {
    ssError -= effect.ss;
  });
  
  const dfError = n - effects.reduce((sum, e) => sum + e.df, 0) - 1;
  const msError = ssError / dfError;
  
  // Calculate F-statistics and p-values
  const results = effects.map(effect => {
    const f = effect.ms / msError;
    const pValue = 1 - fCDF(f, effect.df, dfError);
    const etaSquared = effect.ss / ssTotal;
    
    return {
      ...effect,
      f_statistic: f,
      p_value: pValue,
      eta_squared: etaSquared,
      significant: pValue < 0.05
    };
  });
  
  return {
    effects: results,
    ss_error: ssError,
    df_error: dfError,
    ms_error: msError,
    ss_total: ssTotal
  };
}

// Log-rank test for survival analysis
export function logRankTest(survivalData) {
  // survivalData is object: { groupName: [{time, status}...] }
  const groups = Object.keys(survivalData);
  
  // Collect all unique event times
  const allTimes = new Set();
  groups.forEach(group => {
    survivalData[group].forEach(obs => {
      if (obs.status === 1) {
        allTimes.add(obs.time);
      }
    });
  });
  
  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
  
  // For each time, calculate observed and expected deaths per group
  const observed = {};
  const expected = {};
  
  groups.forEach(g => {
    observed[g] = 0;
    expected[g] = 0;
  });
  
  sortedTimes.forEach(t => {
    // Count at risk and deaths at this time
    const atRisk = {};
    let totalAtRisk = 0;
    let totalDeaths = 0;
    
    groups.forEach(group => {
      atRisk[group] = survivalData[group].filter(obs => obs.time >= t).length;
      totalAtRisk += atRisk[group];
      
      const deaths = survivalData[group].filter(obs => obs.time === t && obs.status === 1).length;
      observed[group] += deaths;
      totalDeaths += deaths;
    });
    
    if (totalAtRisk === 0 || totalDeaths === 0) return;
    
    // Expected deaths for each group
    groups.forEach(group => {
      const exp = (atRisk[group] / totalAtRisk) * totalDeaths;
      expected[group] += exp;
    });
  });
  
  // Chi-square statistic (sum over all groups except last)
  let chiSquare = 0;
  let totalVariance = 0;
  
  groups.slice(0, -1).forEach(group => {
    const diff = observed[group] - expected[group];
    totalVariance += expected[group];
    chiSquare += (diff * diff) / (expected[group] || 1);
  });
  
  const df = groups.length - 1;
  const pValue = 1 - chiSquareCDF(chiSquare, df);
  
  return {
    test_statistic: chiSquare,
    degrees_of_freedom: df,
    p_value: pValue,
    significant: pValue < 0.05
  };
}