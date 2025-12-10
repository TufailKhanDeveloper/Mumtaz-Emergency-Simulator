import React, { useState } from 'react';

const MMC = () => {
  const [lambda, setLambda] = useState(''); // Arrival rate
  const [mu, setMu] = useState(''); // Service rate
  const [servers, setServers] = useState(''); // Number of servers
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("form");
  const [showFormula, setShowFormula] = useState(false);

  const factorial = (n) => {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  const calculatePo = (c, rho) => {
    let sum = 0;
    for (let n = 0; n < c; n++) {
      sum += Math.pow(c * rho, n) / factorial(n);
    }
    const denominator = sum + Math.pow(c * rho, c) / (factorial(c) * (1 - rho));
    return 1 / denominator;
  };

  const calculateMetrics = () => {
    if (!lambda || !mu || !servers) {
      alert('Please enter all values');
      return;
    }

    const arrivalRate = parseFloat(lambda);
    const serviceRate = parseFloat(mu);
    const c = parseInt(servers, 10);

    if (arrivalRate <= 0 || serviceRate <= 0 || c <= 0) {
      alert('Please enter positive values');
      return;
    }

    setLoading(true);
    
    // Simulate loading for 1.5 seconds
    setTimeout(() => {
      const rho = arrivalRate / (c * serviceRate);

      if (rho >= 1) {
        alert(`Rho (${rho.toFixed(2)}) is greater than or equal to 1. System is unstable.`);
        setLoading(false);
        return;
      }

      const Po = calculatePo(c, rho);
      const Lq = (Po * Math.pow(arrivalRate / serviceRate, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2));
      const L = Lq + arrivalRate / serviceRate;
      const Wq = Lq / arrivalRate;
      const W = Wq + 1 / serviceRate;

      setResults({
        rho: rho.toFixed(3),
        Lq: Lq.toFixed(3),
        L: L.toFixed(3),
        Wq: Wq.toFixed(3),
        W: W.toFixed(3),
        idle: (1 - rho).toFixed(3),
        arrivalRate: arrivalRate.toFixed(3),
        serviceRate: serviceRate.toFixed(3),
        servers: c,
        Po: Po.toFixed(4),
        lambda: lambda,
        mu: mu,
        // Calculation steps
        calcRho: `${arrivalRate} / (${c} × ${serviceRate}) = ${rho.toFixed(3)}`,
        calcLq: `(${Po.toFixed(4)} × (${arrivalRate}/${serviceRate})^${c} × ${rho.toFixed(3)}) / (${c}! × (1-${rho.toFixed(3)})²) = ${Lq.toFixed(3)}`,
        calcL: `${Lq.toFixed(3)} + ${arrivalRate}/${serviceRate} = ${L.toFixed(3)}`,
        calcWq: `${Lq.toFixed(3)} / ${arrivalRate} = ${Wq.toFixed(3)}`,
        calcW: `${Wq.toFixed(3)} + 1/${serviceRate} = ${W.toFixed(3)}`,
        calcIdle: `1 - ${rho.toFixed(3)} = ${(1-rho).toFixed(3)}`,
        // Formulas (actual mathematical formulas) - FIXED: No special characters causing errors
        formulaRho: `ρ = λ / (C × μ)`,
        formulaLq: `Lq = (P₀ × (λ/μ)^C × ρ) / (C! × (1-ρ)²)`,
        formulaL: `L = Lq + λ/μ`,
        formulaWq: `Wq = Lq / λ`,
        formulaW: `W = Wq + 1/μ`,
        formulaIdle: `P(idle) = 1 - ρ`,
        formulaPo: `P₀ = 1 / [∑ (Cρ)ⁿ/n! + (Cρ)^C/(C!(1-ρ))]`
      });
      
      setLoading(false);
      setTab("results");
      setShowFormula(false);
    }, 1500);
  };

  // Reset form
  const resetForm = () => {
    setLambda('');
    setMu('');
    setServers('');
    setResults(null);
    setTab("form");
    setShowFormula(false);
  };

  // Results cards data - WITH FORMULAS
  const resultsCards = results ? [
    {
      title: "Utilization (ρ)",
      value: results.rho,
      description: "System utilization factor",
      gradient: "from-[#6D9197] to-[#2F575D]",
      calculation: results.calcRho,
      formula: results.formulaRho
    },
    {
      title: "Avg Queue Length (Lq)",
      value: results.Lq,
      description: "Customers waiting in queue",
      gradient: "from-[#2F575D] to-[#28363D]",
      calculation: results.calcLq,
      formula: results.formulaLq
    },
    {
      title: "Avg in System (L)",
      value: results.L,
      description: "Total customers in system",
      gradient: "from-[#28363D] to-[#6D9197]",
      calculation: results.calcL,
      formula: results.formulaL
    },
    {
      title: "Avg Wait Time (Wq)",
      value: results.Wq,
      description: "Time spent in queue",
      gradient: "from-[#6D9197] to-[#2F575D]",
      calculation: results.calcWq,
      formula: results.formulaWq
    },
    {
      title: "Avg System Time (W)",
      value: results.W,
      description: "Total time in system",
      gradient: "from-[#2F575D] to-[#28363D]",
      calculation: results.calcW,
      formula: results.formulaW
    },
    {
      title: "Idle Probability",
      value: results.idle,
      description: "Probability server is idle",
      gradient: "from-[#28363D] to-[#6D9197]",
      calculation: results.calcIdle,
      formula: results.formulaIdle
    }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7f8] to-[#e8f0f2] p-4 md:p-8">
      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setTab("form")}
              className={`flex-1 py-4 text-center font-bold text-lg transition ${
                tab === "form" 
                  ? "bg-[#6D9197] text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Input Parameters
            </button>
            <button
              onClick={() => tab === "results" && setTab("results")}
              className={`flex-1 py-4 text-center font-bold text-lg transition ${
                tab === "results" 
                  ? "bg-[#2F575D] text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${!results && "opacity-50 cursor-not-allowed"}`}
              disabled={!results}
            >
              Results
            </button>
          </div>

          {/* Form Tab */}
          {tab === "form" && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-center text-[#2F575D] mb-8">
                Enter M/M/C Queue Parameters
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Arrival Rate */}
                <div className="group">
                  <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                     Arrival Rate (λ)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={lambda}
                    onChange={(e) => setLambda(e.target.value)}
                    className="w-full px-6 py-4 text-xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                             border-2 border-[#6D9197]/30 rounded-2xl focus:border-[#6D9197] focus:ring-4 focus:ring-[#6D9197]/20 
                             transition-all duration-300 shadow-inner"
                    placeholder="e.g., 3.96"
                  />
                  <p className="mt-2 text-xs text-gray-600 text-center font-medium">
                    Customers arriving per unit time
                  </p>
                </div>

                {/* Service Rate */}
                <div className="group">
                  <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                    Service Rate (μ)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={mu}
                    onChange={(e) => setMu(e.target.value)}
                    className="w-full px-6 py-4 text-xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                             border-2 border-[#2F575D]/30 rounded-2xl focus:border-[#2F575D] focus:ring-4 focus:ring-[#2F575D]/20 
                             transition-all duration-300 shadow-inner"
                    placeholder="e.g., 5.00"
                  />
                  <p className="mt-2 text-xs text-gray-600 text-center font-medium">
                    Customers served per unit time
                  </p>
                </div>

                {/* Number of Servers */}
                <div className="group">
                  <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                    Number of Servers (C)
                  </label>
                  <input
                    type="number"
                    value={servers}
                    onChange={(e) => setServers(e.target.value)}
                    className="w-full px-6 py-4 text-xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                             border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                             transition-all duration-300 shadow-inner"
                    placeholder="e.g., 2"
                  />
                  <p className="mt-2 text-xs text-gray-600 text-center font-medium">
                    Parallel servers in the system
                  </p>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="flex justify-center mt-10">
                <button
                  onClick={calculateMetrics}
                  disabled={loading}
                  className="group relative px-12 py-6 text-2xl font-bold text-white 
                           bg-gradient-to-r from-[#6D9197] via-[#2F575D] to-[#28363D] 
                           rounded-2xl shadow-2xl hover:shadow-[#6D9197]/60 
                           transform hover:scale-105 active:scale-95 transition-all duration-500 
                           overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Calculating...
                    </div>
                  ) : (
                    <>
                      <span className="relative z-10">CALCULATE METRICS</span>
                      <div className="absolute inset-0 bg-gradient-to-l from-[#28363D] to-[#6D9197] 
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results Tab */}
          {tab === "results" && results && (
            <div className="p-8">
              <h2 className="text-3xl font-bold text-center text-[#2F575D] mb-8">
                M/M/C Queue Results
              </h2>

              {/* Input Summary */}
              <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow border border-gray-200">
                <h3 className="text-xl font-bold text-[#2F575D] mb-4">Input Parameters Used</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Arrival Rate (λ)</div>
                    <div className="text-2xl font-bold text-[#6D9197]">{results.lambda}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Service Rate (μ)</div>
                    <div className="text-2xl font-bold text-[#2F575D]">{results.mu}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Servers (C)</div>
                    <div className="text-2xl font-bold text-[#28363D]">{results.servers}</div>
                  </div>
                </div>
              </div>

              {/* Show/Hide Formula Button */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={() => setShowFormula(!showFormula)}
                  className="px-6 py-3 bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white font-medium rounded-lg hover:opacity-90 transition"
                >
                  {showFormula ? 'Hide Formulas & Calculations' : 'Show Formulas & Calculations'}
                </button>
              </div>

              {/* Horizontal Scrollable Results Cards */}
              <div className="mb-10">
                <div className="flex overflow-x-auto pb-6 space-x-6 px-2 scrollbar-thin scrollbar-thumb-[#6D9197] scrollbar-track-gray-200">
                  {resultsCards.map((card, index) => (
                    <div 
                      key={index} 
                      className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {/* Card Header with Gradient */}
                      <div className={`bg-gradient-to-br ${card.gradient} p-4 text-white`}>
                        <h3 className="text-xl font-bold">{card.title}</h3>
                      </div>
                      
                      {/* Card Body */}
                      <div className="p-6">
                        <div className="text-4xl font-black text-center text-[#2F575D] mb-3">
                          {card.value}
                        </div>
                        <p className="text-center text-gray-600 text-sm mb-3">
                          {card.description}
                        </p>
                        
                        {/* Formula and Calculation Section */}
                        {showFormula && (
                          <div className="mt-4 space-y-3">
                            {/* Formula */}
                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-xs font-semibold text-blue-800 mb-1">Formula:</div>
                              <div className="text-xs font-mono text-blue-700 font-medium">
                                {card.formula}
                              </div>
                            </div>
                            
                            {/* Calculation */}
                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-300">
                              <div className="text-xs font-semibold text-gray-700 mb-1">Calculation:</div>
                              <div className="text-xs font-mono text-gray-600 break-words">
                                {card.calculation}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Scroll Indicator */}
                <div className="text-center mt-4 text-gray-500 text-sm">
                  ← Scroll horizontally to see all metrics →
                </div>
              </div>

              {/* Performance Insights Card */}
              <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 p-6 mb-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-[#2F575D]">
                    Performance Insights
                  </h3>
                  <div className="text-sm bg-[#2F575D] text-white px-3 py-1 rounded-full">
                    M/M/C Queue
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Utilization Progress */}
                  <div>
                    <h4 className="text-lg font-semibold text-[#28363D] mb-4">Utilization Analysis</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Utilization: {(parseFloat(results.rho) * 100).toFixed(1)}%</span>
                          <span className="font-medium text-[#6D9197]">Idle: {(parseFloat(results.idle) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] h-full rounded-full transition-all duration-1000 flex items-center justify-center"
                            style={{ width: `${parseFloat(results.rho) * 100}%` }}
                          >
                            <span className="text-white text-sm font-bold">
                              {parseFloat(results.rho) >= 0.5 ? "Busy" : "Moderate"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Formulas */}
                      {showFormula && (
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm font-semibold text-blue-800 mb-1">P₀ (Empty System Probability):</div>
                            <div className="text-xs font-mono text-blue-700">
                              P₀ = 1 / [∑ (Cρ)ⁿ/n! + (Cρ)^C/(C!(1-ρ))]<br/>
                              P₀ = {results.Po}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* System Status */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${parseFloat(results.rho) >= 0.8 ? 'bg-red-500' : parseFloat(results.rho) >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                        <div className="font-medium">
                          System Status: {parseFloat(results.rho) >= 0.8 ? 'High Load' : parseFloat(results.rho) >= 0.5 ? 'Moderate Load' : 'Light Load'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {parseFloat(results.rho) >= 0.8 
                          ? 'Consider adding more servers to reduce queue length.' 
                          : parseFloat(results.rho) >= 0.5 
                            ? 'System is operating at optimal utilization.' 
                            : 'System has capacity available for more customers.'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Performance Insights */}
                  <div>
                    <h4 className="text-lg font-semibold text-[#28363D] mb-4">Performance Summary</h4>
                    <div className="space-y-4">
                      {[
                        { label: "Avg Wait in Queue", value: results.Wq, color: "text-[#6D9197]" },
                        { label: "Avg System Time", value: results.W, color: "text-[#2F575D]" },
                        { label: "Queue Length", value: results.Lq, color: "text-[#28363D]" },
                        { label: "System Population", value: results.L, color: "text-[#6D9197]" }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.label}</span>
                            <span className={`font-bold ${item.color}`}>{item.value}</span>
                          </div>
                          {showFormula && (
                            <div className="text-xs font-mono text-gray-600 mt-2 p-2 bg-white rounded border">
                              {idx === 0 && `Wq = Lq / λ`}
                              {idx === 1 && `W = Wq + 1/μ`}
                              {idx === 2 && `Lq = (P₀ × (λ/μ)^C × ρ) / (C! × (1-ρ)²)`}
                              {idx === 3 && `L = Lq + λ/μ`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Formula Section */}
              {showFormula && (
                <div className="mb-10 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow">
                  <h3 className="text-xl font-bold text-[#2F575D] mb-4">Complete M/M/C Formulas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#6D9197] mb-1">1. Utilization Factor</div>
                      <div className="text-sm font-mono">ρ = λ / (C × μ)</div>
                      <div className="text-xs text-gray-600 mt-1">System utilization must be ρ greater one</div>
                    </div>
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#2F575D] mb-1">2. Probability of Zero Customers</div>
                      <div className="text-sm font-mono">P₀ = 1 / [∑ (Cρ)ⁿ/n! + (Cρ)^C/(C!(1-ρ))]</div>
                    </div>
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#28363D] mb-1">3. Average Queue Length</div>
                      <div className="text-sm font-mono">Lq = (P₀ × (λ/μ)^C × ρ) / (C! × (1-ρ)²)</div>
                    </div>
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#6D9197] mb-1">4. Average System Length</div>
                      <div className="text-sm font-mono">L = Lq + λ/μ</div>
                    </div>
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#2F575D] mb-1">5. Average Waiting Time</div>
                      <div className="text-sm font-mono">Wq = Lq / λ</div>
                    </div>
                    <div className="p-3 bg-white/70 rounded-lg border">
                      <div className="font-semibold text-[#28363D] mb-1">6. Average System Time</div>
                      <div className="text-sm font-mono">W = Wq + 1/μ</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row justify-center gap-6 mt-10">
                <button
                  onClick={resetForm}
                  className="px-8 py-4 bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white font-bold rounded-xl hover:shadow-lg transition-all hover:scale-105"
                >
                  New Calculation
                </button>
                <button
                  onClick={() => {
                    const text = `
M/M/C Queue Results:
Input Parameters:
- Arrival Rate (λ): ${results.lambda}
- Service Rate (μ): ${results.mu}
- Servers (C): ${results.servers}

Results:
- Utilization (ρ): ${results.rho}
- Avg Queue Length (Lq): ${results.Lq}
- Avg in System (L): ${results.L}
- Avg Wait Time (Wq): ${results.Wq}
- Avg System Time (W): ${results.W}
- Idle Probability: ${results.idle}
                    `;
                    navigator.clipboard.writeText(text);
                    alert('Results copied to clipboard!');
                  }}
                  className="px-8 py-4 bg-white border-2 border-[#2F575D] text-[#2F575D] font-bold rounded-xl hover:bg-[#2F575D] hover:text-white transition-all"
                >
                  Copy Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-[#6D9197] border-t-transparent rounded-full animate-spin mb-6"></div>
              <h3 className="text-xl font-bold text-[#2F575D] mb-2">Calculating M/M/C Metrics</h3>
              <p className="text-[#6D9197] text-center">
                Please wait while we compute the queueing model...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-6">
                <div className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] h-full rounded-full animate-[progress_1.5s_linear]"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add custom animation and scrollbar hiding */}
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MMC;