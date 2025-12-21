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