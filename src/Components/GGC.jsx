import React, { useState } from 'react';

const GGC = () => {
  // State variables
  const [servers, setServers] = useState(''); // Number of servers
  const [distribution, setDistribution] = useState('uniform'); // Single distribution type
  
  // Arrival parameters
  const [arrivalMin, setArrivalMin] = useState('');
  const [arrivalMax, setArrivalMax] = useState('');
  const [arrivalMean, setArrivalMean] = useState('');
  const [arrivalVariance, setArrivalVariance] = useState('');
  
  // Service parameters
  const [serviceMin, setServiceMin] = useState('');
  const [serviceMax, setServiceMax] = useState('');
  const [serviceMean, setServiceMean] = useState('');
  const [serviceVariance, setServiceVariance] = useState('');
  
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

  // Calculate Arrival parameters (mean and Ca²)
  const calculateArrivalParams = () => {
    let meanArrival, varianceArrival;
    
    switch(distribution) {
      case 'uniform':
        const aMin = parseFloat(arrivalMin);
        const aMax = parseFloat(arrivalMax);
        meanArrival = (aMin + aMax) / 2;
        varianceArrival = Math.pow(aMax - aMin, 2) / 12;
        break;
      
      case 'normal':
      case 'gamma':
        meanArrival = parseFloat(arrivalMean);
        varianceArrival = parseFloat(arrivalVariance);
        break;
      
      default:
        meanArrival = 0;
        varianceArrival = 0;
    }
    
    const arrivalRate = 1 / meanArrival;
    const ca2 = varianceArrival / Math.pow(meanArrival, 2);
    
    return { arrivalRate, meanArrival, varianceArrival, ca2 };
  };

  // Calculate Service parameters (mean and Cs²)
  const calculateServiceParams = () => {
    let meanService, varianceService;
    
    switch(distribution) {
      case 'uniform':
        const sMin = parseFloat(serviceMin);
        const sMax = parseFloat(serviceMax);
        meanService = (sMin + sMax) / 2;
        varianceService = Math.pow(sMax - sMin, 2) / 12;
        break;
      
      case 'normal':
      case 'gamma':
        meanService = parseFloat(serviceMean);
        varianceService = parseFloat(serviceVariance);
        break;
      
      default:
        meanService = 0;
        varianceService = 0;
    }
    
    const serviceRate = 1 / meanService;
    const cs2 = varianceService / Math.pow(meanService, 2);
    
    return { serviceRate, meanService, varianceService, cs2 };
  };

  const calculateMetrics = () => {
    // Validate servers
    if (!servers || parseInt(servers) < 1) {
      alert('Please enter valid number of servers (≥ 1)');
      return;
    }

    // Validate inputs based on distribution
    if (distribution === 'uniform') {
      // Check arrival limits
      if (!arrivalMin || !arrivalMax || parseFloat(arrivalMin) >= parseFloat(arrivalMax)) {
        alert('Please enter valid arrival min and max times (min < max)');
        return;
      }
      // Check service limits
      if (!serviceMin || !serviceMax || parseFloat(serviceMin) >= parseFloat(serviceMax)) {
        alert('Please enter valid service min and max times (min < max)');
        return;
      }
    } else {
      // For normal/gamma, check mean and variance
      if (!arrivalMean || !arrivalVariance || parseFloat(arrivalVariance) <= 0) {
        alert('Please enter valid arrival mean and variance (variance > 0)');
        return;
      }
      if (!serviceMean || !serviceVariance || parseFloat(serviceVariance) <= 0) {
        alert('Please enter valid service mean and variance (variance > 0)');
        return;
      }
    }

    const c = parseInt(servers, 10);
    
    // Calculate arrival and service parameters
    const arrivalParams = calculateArrivalParams();
    const serviceParams = calculateServiceParams();
    
    const arrivalRate = arrivalParams.arrivalRate;
    const serviceRate = serviceParams.serviceRate;
    const meanArrival = arrivalParams.meanArrival;
    const meanService = serviceParams.meanService;
    const ca2 = arrivalParams.ca2;
    const cs2 = serviceParams.cs2;

    setLoading(true);
    
    setTimeout(() => {
      const rho = arrivalRate / (c * serviceRate);

      if (rho >= 1) {
        alert(`Rho (${rho.toFixed(2)}) is greater than or equal to 1. System is unstable.`);
        setLoading(false);
        return;
      }

      const Po = calculatePo(c, rho);
      const LqMMC = (Po * Math.pow(arrivalRate / serviceRate, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2));
      const Lq = LqMMC * ((ca2 + cs2) / 2); // G/G/C formula
      const L = Lq + arrivalRate / serviceRate;
      const Wq = Lq / arrivalRate;
      const W = Wq + meanService; // Mean service time
      const idle = 1 - rho;

      setResults({
        rho: rho.toFixed(3),
        Lq: Lq.toFixed(3),
        L: L.toFixed(3),
        Wq: Wq.toFixed(3),
        W: W.toFixed(3),
        idle: idle.toFixed(3),
        ca2: ca2.toFixed(3),
        cs2: cs2.toFixed(3),
        arrivalRate: arrivalRate.toFixed(3),
        serviceRate: serviceRate.toFixed(3),
        meanArrival: meanArrival.toFixed(3),
        meanService: meanService.toFixed(3),
        servers: c,
        distribution: distribution,
        
        // Calculation steps
        calcRho: `${arrivalRate.toFixed(3)} / (${c} × ${serviceRate.toFixed(3)}) = ${rho.toFixed(3)}`,
        calcCa2: `Ca² = ${ca2.toFixed(3)}`,
        calcCs2: `Cs² = ${cs2.toFixed(3)}`,
        calcLqMMC: `Lq(M/M/C) = ${LqMMC.toFixed(3)}`,
        calcLq: `Lq = ${LqMMC.toFixed(3)} × ((${ca2.toFixed(3)} + ${cs2.toFixed(3)})/2) = ${Lq.toFixed(3)}`,
        calcL: `${Lq.toFixed(3)} + ${arrivalRate.toFixed(3)}/${serviceRate.toFixed(3)} = ${L.toFixed(3)}`,
        calcWq: `${Lq.toFixed(3)} / ${arrivalRate.toFixed(3)} = ${Wq.toFixed(3)}`,
        calcW: `${Wq.toFixed(3)} + ${meanService.toFixed(3)} = ${W.toFixed(3)}`,
        calcIdle: `1 - ${rho.toFixed(3)} = ${idle.toFixed(3)}`,
        
        // Formulas
        formulaRho: `ρ = λ / (C × μ)`,
        formulaCa2: `Ca² = Var(A) / E[A]²`,
        formulaCs2: `Cs² = Var(S) / E[S]²`,
        formulaLq: `Lq = Lq(M/M/C) × (Ca² + Cs²)/2`,
        formulaL: `L = Lq + λ/μ`,
        formulaWq: `Wq = Lq / λ`,
        formulaW: `W = Wq + 1/μ`,
        formulaIdle: `P(idle) = 1 - ρ`
      });
      
      setLoading(false);
      setTab("results");
      setShowFormula(false);
    }, 1500);
  };

  // Reset form
  const resetForm = () => {
    setServers('');
    setDistribution('uniform');
    
    // Reset arrival fields
    setArrivalMin('');
    setArrivalMax('');
    setArrivalMean('');
    setArrivalVariance('');
    
    // Reset service fields
    setServiceMin('');
    setServiceMax('');
    setServiceMean('');
    setServiceVariance('');
    
    setResults(null);
    setTab("form");
    setShowFormula(false);
  };

  // Results cards data - Exact same colors as MGC
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
      title: "Ca² (Arrival)",
      value: results.ca2,
      description: "Arrival coefficient of variation",
      gradient: "from-[#2F575D] to-[#28363D]",
      calculation: results.calcCa2,
      formula: results.formulaCa2
    },
    {
      title: "Cs² (Service)",
      value: results.cs2,
      description: "Service coefficient of variation",
      gradient: "from-[#28363D] to-[#6D9197]",
      calculation: results.calcCs2,
      formula: results.formulaCs2
    },
    {
      title: "Avg Queue Length (Lq)",
      value: results.Lq,
      description: "Customers waiting in queue",
      gradient: "from-[#6D9197] to-[#2F575D]",
      calculation: results.calcLq,
      formula: results.formulaLq
    },
    {
      title: "Avg in System (L)",
      value: results.L,
      description: "Total customers in system",
      gradient: "from-[#2F575D] to-[#28363D]",
      calculation: results.calcL,
      formula: results.formulaL
    },
    {
      title: "Avg Wait Time (Wq)",
      value: results.Wq,
      description: "Time spent in queue",
      gradient: "from-[#28363D] to-[#6D9197]",
      calculation: results.calcWq,
      formula: results.formulaWq
    },
    {
      title: "Avg System Time (W)",
      value: results.W,
      description: "Total time in system",
      gradient: "from-[#6D9197] to-[#2F575D]",
      calculation: results.calcW,
      formula: results.formulaW
    },
    {
      title: "Idle Probability",
      value: results.idle,
      description: "Probability server is idle",
      gradient: "from-[#2F575D] to-[#28363D]",
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
{/* Form Tab */}
{tab === "form" && (
  <div className="p-8">
    <h2 className="text-3xl font-bold text-center text-[#2F575D] mb-8">
      G/G/C Queue Parameters
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Number of Servers */}
      <div className="group">
        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
          Servers (C)
        </label>
        <input
          type="number"
          value={servers}
          onChange={(e) => setServers(e.target.value)}
          className="w-full px-6 py-4 text-xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                   border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                   transition-all duration-300 shadow-inner"
          placeholder="e.g., 2"
          min="1"
        />
        <p className="mt-2 text-xs text-gray-600 text-center font-medium">
          Number of parallel servers (recommended: 1-5)
        </p>
      </div>

      {/* Distribution Type - Single dropdown */}
      <div className="group">
        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
          Distribution Type
        </label>
        <select
          value={distribution}
          onChange={(e) => {
            setDistribution(e.target.value);
            // Set default values when distribution changes
            if (e.target.value === 'uniform') {
              setArrivalMin("1.5");
              setArrivalMax("3.0");
              setServiceMin("0.8");
              setServiceMax("1.2");
              setArrivalMean("");
              setArrivalVariance("");
              setServiceMean("");
              setServiceVariance("");
            } else {
              setArrivalMin("");
              setArrivalMax("");
              setServiceMin("");
              setServiceMax("");
              setArrivalMean("2.5");
              setArrivalVariance("0.5");
              setServiceMean("1.0");
              setServiceVariance("0.2");
            }
          }}
          className="w-full px-6 py-4 text-xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                   border-2 border-[#2F575D]/30 rounded-2xl focus:border-[#2F575D] focus:ring-4 focus:ring-[#2F575D]/20 
                   transition-all duration-300 shadow-inner"
        >
          <option value="uniform">Uniform</option>
          <option value="normal">Normal</option>
          <option value="gamma">Gamma</option>
        </select>
        <p className="mt-2 text-xs text-gray-600 text-center font-medium">
          Select time distribution
        </p>
      </div>

      {/* Empty div for 3rd column alignment */}
      <div></div>
    </div>

    {/* Arrival Parameters Section */}
    <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow border border-gray-200">
      <h3 className="text-xl font-bold text-[#2F575D] mb-4">
        Arrival Parameters ({distribution.charAt(0).toUpperCase() + distribution.slice(1)} Distribution)
      </h3>
      
      {distribution === 'uniform' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Min Arrival Time
            </label>
            <input
              type="number"
              step="0.01"
              value={arrivalMin}
              onChange={(e) => setArrivalMin(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197] focus:ring-2 focus:ring-[#6D9197]/20 transition"
              placeholder="e.g., 1.5"
            />
            <p className="mt-1 text-xs text-gray-600">Minimum inter-arrival time (recommended: 1.5-2)</p>
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Max Arrival Time
            </label>
            <input
              type="number"
              step="0.01"
              value={arrivalMax}
              onChange={(e) => setArrivalMax(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#2F575D]/30 rounded-lg focus:border-[#2F575D] focus:ring-2 focus:ring-[#2F575D]/20 transition"
              placeholder="e.g., 3.0"
            />
            <p className="mt-1 text-xs text-gray-600">Maximum inter-arrival time (recommended: 3-4)</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Arrival Mean
            </label>
            <input
              type="number"
              step="0.01"
              value={arrivalMean}
              onChange={(e) => setArrivalMean(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197] focus:ring-2 focus:ring-[#6D9197]/20 transition"
              placeholder="e.g., 2.5"
            />
            <p className="mt-1 text-xs text-gray-600">Mean inter-arrival time (recommended: 2-3)</p>
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Arrival Variance
            </label>
            <input
              type="number"
              step="0.01"
              value={arrivalVariance}
              onChange={(e) => setArrivalVariance(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#2F575D]/30 rounded-lg focus:border-[#2F575D] focus:ring-2 focus:ring-[#2F575D]/20 transition"
              placeholder="e.g., 0.5"
            />
            <p className="mt-1 text-xs text-gray-600">Variance of inter-arrival time (recommended: 0.3-0.8)</p>
          </div>
        </div>
      )}
    </div>

    {/* Service Parameters Section */}
    <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow border border-gray-200">
      <h3 className="text-xl font-bold text-[#2F575D] mb-4">
        Service Parameters ({distribution.charAt(0).toUpperCase() + distribution.slice(1)} Distribution)
      </h3>
      
      {distribution === 'uniform' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Min Service Time
            </label>
            <input
              type="number"
              step="0.01"
              value={serviceMin}
              onChange={(e) => setServiceMin(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197] focus:ring-2 focus:ring-[#6D9197]/20 transition"
              placeholder="e.g., 0.8"
            />
            <p className="mt-1 text-xs text-gray-600">Minimum service time (recommended: 0.8-1.2)</p>
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Max Service Time
            </label>
            <input
              type="number"
              step="0.01"
              value={serviceMax}
              onChange={(e) => setServiceMax(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#2F575D]/30 rounded-lg focus:border-[#2F575D] focus:ring-2 focus:ring-[#2F575D]/20 transition"
              placeholder="e.g., 1.2"
            />
            <p className="mt-1 text-xs text-gray-600">Maximum service time (recommended: 1.2-1.8)</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Service Mean
            </label>
            <input
              type="number"
              step="0.01"
              value={serviceMean}
              onChange={(e) => setServiceMean(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197] focus:ring-2 focus:ring-[#6D9197]/20 transition"
              placeholder="e.g., 1.0"
            />
            <p className="mt-1 text-xs text-gray-600">Mean service time (recommended: 0.8-1.2)</p>
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-3">
              Service Variance
            </label>
            <input
              type="number"
              step="0.01"
              value={serviceVariance || "0.2"}
              onChange={(e) => setServiceVariance(e.target.value)}
              className="w-full px-4 py-3 text-lg border-2 border-[#2F575D]/30 rounded-lg focus:border-[#2F575D] focus:ring-2 focus:ring-[#2F575D]/20 transition"
              placeholder="e.g., 0.2"
            />
            <p className="mt-1 text-xs text-gray-600">Variance of service time (recommended: 0.1-0.4)</p>
          </div>
        </div>
      )}
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
            <span className="relative z-10">CALCULATE G/G/C METRICS</span>
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
                G/G/C Queue Results ({results.distribution.charAt(0).toUpperCase() + results.distribution.slice(1)} Distribution)
              </h2>

              {/* Input Summary */}
              <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow border border-gray-200">
                <h3 className="text-xl font-bold text-[#2F575D] mb-4">Input Parameters Used</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Servers (C)</div>
                    <div className="text-2xl font-bold text-[#28363D]">{results.servers}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Distribution</div>
                    <div className="text-xl font-bold text-[#6D9197]">{results.distribution.charAt(0).toUpperCase() + results.distribution.slice(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Arrival Rate (λ)</div>
                    <div className="text-2xl font-bold text-[#6D9197]">{results.arrivalRate}</div>
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
                    G/G/C Queue
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
                      
                      {/* Utilization Formula */}
                      {showFormula && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-sm font-semibold text-blue-800 mb-1">Utilization Formula:</div>
                          <div className="text-xs font-mono text-blue-700">
                            ρ = λ / (C × μ)<br/>
                            = {results.arrivalRate} / ({results.servers} × {results.serviceRate})<br/>
                            = {results.rho}
                          </div>
                        </div>
                      )}
                      
                      {/* Variability Info */}
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-semibold text-blue-800 mb-1">Variability Impact:</div>
                        <div className="text-xs text-blue-700">
                          {parseFloat(results.ca2) > 1 && parseFloat(results.cs2) > 1 
                            ? 'Both arrival and service have high variability → Long queues expected'
                            : parseFloat(results.ca2) < 1 && parseFloat(results.cs2) < 1
                              ? 'Both arrival and service have low variability → Shorter queues'
                              : 'Mixed variability levels → Moderate queue lengths'}
                        </div>
                      </div>
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
                  
                  {/* Performance Insights with Formulas */}
                  <div>
                    <h4 className="text-lg font-semibold text-[#28363D] mb-4">Performance Summary</h4>
                    <div className="space-y-4">
                      {[
                        { 
                          label: "Avg Wait in Queue", 
                          value: results.Wq, 
                          color: "text-[#6D9197]",
                          formula: `Wq = Lq / λ`,
                          calculation: `${results.Lq} / ${results.arrivalRate} = ${results.Wq}`
                        },
                        { 
                          label: "Avg System Time", 
                          value: results.W, 
                          color: "text-[#2F575D]",
                          formula: `W = Wq + 1/μ`,
                          calculation: `${results.Wq} + 1/${results.serviceRate} = ${results.W}`
                        },
                        { 
                          label: "Queue Length", 
                          value: results.Lq, 
                          color: "text-[#28363D]",
                          formula: `Lq = Lq(M/M/C) × (Ca² + Cs²)/2`,
                          calculation: `${results.calcLqMMC} × (({results.ca2} + {results.cs2})/2) = ${results.Lq}`
                        },
                        { 
                          label: "System Population", 
                          value: results.L, 
                          color: "text-[#6D9197]",
                          formula: `L = Lq + λ/μ`,
                          calculation: `${results.Lq} + ${results.arrivalRate}/${results.serviceRate} = ${results.L}`
                        }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{item.label}</span>
                            <span className={`font-bold ${item.color}`}>{item.value}</span>
                          </div>
                          
                          {/* Formula Section - Show when showFormula is true */}
                          {showFormula && (
                            <div className="mt-2 space-y-2">
                              <div className="p-2 bg-white/80 rounded border border-gray-300">
                                <div className="text-xs font-semibold text-gray-700 mb-1">Formula:</div>
                                <div className="text-xs font-mono text-gray-600">
                                  {item.formula}
                                </div>
                              </div>
                              <div className="p-2 bg-gray-100 rounded border border-gray-400">
                                <div className="text-xs font-semibold text-gray-700 mb-1">Calculation:</div>
                                <div className="text-xs font-mono text-gray-600">
                                  {item.calculation}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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
G/G/C Queue Results:
Distribution: ${results.distribution}
Input Parameters:
- Servers (C): ${results.servers}
- Arrival Rate (λ): ${results.arrivalRate}
- Service Rate (μ): ${results.serviceRate}
- Ca² (Arrival Coeff): ${results.ca2}
- Cs² (Service Coeff): ${results.cs2}

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
              <h3 className="text-xl font-bold text-[#2F575D] mb-2">Calculating G/G/C Metrics</h3>
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

export default GGC;