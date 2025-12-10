import React, { useState, useEffect } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement
);

// ===================== HELPER FUNCTIONS =====================

function factorial(n) {
  if (n > 20) return Infinity; // Safety check for large numbers
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Server utilization calculation function
const calculateServerUtilization = (ganttChart, serverNumber) => {
  if (!ganttChart || ganttChart.length === 0) return "0.0";
  
  // Filter segments for the specific server
  const serverSegments = ganttChart.filter(seg => seg.server === serverNumber);
  
  if (serverSegments.length === 0) return "0.0";
  
  const totalBusyTime = serverSegments
    .filter(seg => !seg.idle)
    .reduce((sum, seg) => sum + seg.dur, 0);
  
  const makespan = Math.max(...serverSegments.map(seg => seg.end));
  
  const utilization = (totalBusyTime / makespan) * 100;
  
  return utilization.toFixed(1);
};

function generateCummulativeProbability(lambda, mu, priorityParams = null, numServers = 1) {
  // Reset all arrays
  const arrivalTime = [];
  const serviceTime = [];
  const startTime = [];
  const endingTime = [];
  const waitingTime = [];
  const turnAroundTime = [];
  let priority = [];
  let table = [];
  const cpValues = [];
  const cpLookup = [];
  const interArrival = [];
  const avgTimeBetweenArrival = [];
  const server = [];

  // Generate CP values - LIMITED to prevent infinite loop
  let cp = 0;
  let cplookup = 0;
  let count = 0;
  const maxIterations = 400; // Safety limit
  
  while (cp.toFixed(6) <= 0.999999 && count < maxIterations) {
    // Calculate individual probability using Poisson formula
    let calc = Math.exp(-lambda) * Math.pow(lambda, count) / factorial(count);
    
    // Store the previous cumulative probability
    cplookup = cp;
    cpLookup[count] = cplookup;
    
    // Update the cumulative probability
    cp = calc + cplookup;
    cpValues[count] = cp;
    
    count++;
  }

  // Generate service times for each customer
  for (let i = 0; i < cpLookup.length; i++) {
    let st = Math.round(-mu * Math.log(1 - Math.random() + 0.0001)); // Avoid log(0)
    serviceTime.push(st < 1 ? 1 : st);
  }

  // Generate priority values if priority is enabled
  if (priorityParams) {
    let Z = 10112166,
      A = 55,
      M = 1994,
      C = 9,
      zi = Z;
    priority = [];
    for (let i = 0; i < cpLookup.length; i++) {
      zi = (A * zi + C) % M;
      let r = Math.random();
      priority.push(
        Math.round(priorityParams.a + r * (priorityParams.b - priorityParams.a))
      );
    }
  } else {
    priority = Array(cpLookup.length).fill(1);
  }

  // Generate inter-arrival times
  let inter = [0];
  for (let i = 1; i < cpLookup.length; i++) {
    let r = Math.random();
    let found = false;
    for (let j = 1; j < cpLookup.length; j++) {
      if (cpLookup[j - 1] <= r && r < cpLookup[j]) {
        inter.push(j);
        found = true;
        break;
      }
    }
    if (!found) inter.push(1); // Default to 1 instead of 0
  }

  // Calculate arrival times
  let currentArrival = 0;
  for (let i = 0; i < inter.length; i++) {
    if (i === 0) {
      arrivalTime.push(0);
    } else {
      currentArrival += inter[i];
      arrivalTime.push(currentArrival);
    }
  }

  // Calculate average time between arrivals
  for (let i = 0; i < arrivalTime.length; i++) {
    avgTimeBetweenArrival.push(i);
  }

  // Store inter-arrival times
  interArrival.push(...inter);

  // Calculate schedule and performance measures
  const gantt = calculateSchedule(arrivalTime, serviceTime, priority, numServers);
  performanceMeasures(arrivalTime, serviceTime, gantt, startTime, endingTime, waitingTime, turnAroundTime, server);

  // Calculate server utilization
  const total = serviceTime.reduce((a, b) => a + b, 0);
  const makespan = gantt.length > 0 ? gantt[gantt.length - 1]?.end || 1 : 1;
  const util = ((total / makespan) * 100).toFixed(1);

  // Create table with all required columns
  table = arrivalTime.map((at, i) => ({
    serialNumber: i + 1,
    cpLookup: cpLookup[i] || 0,
    cp: cpValues[i] || 0,
    avgTimeBetweenArrival: avgTimeBetweenArrival[i] || 0,
    interArrival: interArrival[i] || 0,
    arrivalTime: at,
    serviceTime: serviceTime[i] || 0,
    startTime: startTime[i] || 0,
    endTime: endingTime[i] || 0,
    turnaroundTime: turnAroundTime[i] || 0,
    waitTime: waitingTime[i] || 0,
    responseTime: (startTime[i] || 0) - at,
    server: server[i] || "Server 1",
    priority: priority[i] || 1
  }));

  return { table, ganttChart: gantt, utilization: util };
}

function calculateSchedule(arr, serv, prio, numServers = 1) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    prio: prio[i],
    completed: false,
    startTime: null,
    server: null
  }));

  // Track when each server becomes available
  let serverAvailableTime = Array(numServers).fill(0);
  let serverLastEndTime = Array(numServers).fill(0);
  let serverCurrentProcess = Array(numServers).fill(null);

  let iterations = 0;
  const maxIterations = 1000; // Safety limit

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < maxIterations) {
    iterations++;
    
    // Add newly arrived customers to queue
    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    // Sort queue by priority and arrival time
    q.sort((a, b) => a.prio - b.prio || a.arr - b.arr);

    // Check for idle time between server last end time and current time
    for (let s = 0; s < numServers; s++) {
      if (serverLastEndTime[s] < t && serverAvailableTime[s] <= t) {
        // Add idle time segment
        const idleStart = serverLastEndTime[s];
        const idleEnd = t;
        if (idleEnd > idleStart) {
          gantt.push({
            id: -1, // -1 indicates idle time
            prio: 0,
            server: s + 1,
            start: +idleStart.toFixed(2),
            end: +idleEnd.toFixed(2),
            dur: +(idleEnd - idleStart).toFixed(2),
            preempted: false,
            idle: true
          });
        }
        serverLastEndTime[s] = t;
      }
    }

    // Check if any server is idle and can start a new process
    for (let s = 0; s < numServers; s++) {
      if (serverAvailableTime[s] <= t && !serverCurrentProcess[s] && q.length > 0) {
        // Find the highest priority process that can be assigned to this server
        let processIndex = -1;
        
        // First, try to find a process with the same priority as currently running processes
        const currentPriorities = serverCurrentProcess.filter(p => p !== null).map(p => p.prio);
        const minCurrentPriority = currentPriorities.length > 0 ? Math.min(...currentPriorities) : Infinity;
        
        // Try to find a process with the same priority as the lowest priority currently running
        for (let i = 0; i < q.length; i++) {
          if (q[i].prio <= minCurrentPriority) {
            processIndex = i;
            break;
          }
        }
        
        // If no process with matching priority found, take the highest priority available
        if (processIndex === -1 && q.length > 0) {
          processIndex = 0;
        }
        
        if (processIndex !== -1) {
          const c = q.splice(processIndex, 1)[0];
          
          // If this is the first time this process is being served, record its start time
          if (c.startTime === null) {
            c.startTime = t;
          }
          
          // Assign to server
          c.server = s + 1;
          serverCurrentProcess[s] = c;
          
          // Calculate service duration
          const serve = c.rem;
          
          // Update server availability and last end time
          serverAvailableTime[s] = t + serve;
          serverLastEndTime[s] = t + serve;
          
          // Add to Gantt chart
          gantt.push({
            id: c.id,
            prio: c.prio,
            server: s + 1,
            start: +t.toFixed(2),
            end: +(t + serve).toFixed(2),
            dur: +serve.toFixed(2),
            preempted: false,
            idle: false
          });
          
          // Mark customer as completed
          c.completed = true;
          c.rem = 0;
        }
      }
    }

    // If all servers are busy, find the next event time
    if (serverCurrentProcess.every(p => p !== null)) {
      // Find the next completion time
      const nextCompletion = Math.min(...serverCurrentProcess.map((p, i) => 
        p ? serverAvailableTime[i] : Infinity
      ));
      
      // Find the next arrival time
      const nextArrival = cust.find((c) => !c.completed && c.arr > t)?.arr || Infinity;
      
      // Move time to the next event
      t = Math.min(nextCompletion, nextArrival);
      
      // Check if any process completed
      for (let s = 0; s < numServers; s++) {
        if (serverCurrentProcess[s] && serverAvailableTime[s] <= t) {
          // Process completed
          serverCurrentProcess[s] = null;
        }
      }
    } else if (q.length === 0) {
      // If queue is empty, find next arrival time
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        t = Math.min(...nextArrivals.map((c) => c.arr));
      } else {
        break;
      }
    } else {
      // If we're here, at least one server is idle but no suitable process found
      // Move time forward by a small amount
      t += 0.01;
    }
  }

  // Add final idle time if any server finishes early
  const finalTime = Math.max(...serverAvailableTime);
  for (let s = 0; s < numServers; s++) {
    if (serverLastEndTime[s] < finalTime) {
      const idleStart = serverLastEndTime[s];
      const idleEnd = finalTime;
      if (idleEnd > idleStart) {
        gantt.push({
          id: -1,
          prio: 0,
          server: s + 1,
          start: +idleStart.toFixed(2),
          end: +idleEnd.toFixed(2),
          dur: +(idleEnd - idleStart).toFixed(2),
          preempted: false,
          idle: true
        });
      }
    }
  }

  // Sort gantt by server and start time
  gantt.sort((a, b) => a.server - b.server || a.start - b.start);
  
  return gantt;
}

function performanceMeasures(arr, serv, gantt, startTime, endingTime, waitingTime, turnAroundTime, server) {
  const first = {};
  const last = {};
  
  // Filter out idle segments for performance calculation
  const processSegments = gantt.filter(seg => !seg.idle);
  
  processSegments.forEach((s) => {
    if (!first[s.id]) first[s.id] = s.start;
    last[s.id] = s.end;
  });

  Object.keys(first).forEach((id) => {
    const i = +id;
    startTime[i] = first[id];
    endingTime[i] = last[id];
    const tat = last[id] - arr[i];
    waitingTime[i] = tat - serv[i];
    turnAroundTime[i] = tat;
    server[i] = gantt.find(g => g.id === i)?.server || "Server 1";
  });
}

function computeSummary(table, utilization, ganttChart = null) {
  if (!table || table.length === 0) return null;
  
  // Helper function for average calculation
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  
  // Calculate overall averages
  const overall = {
    utilization,
    avgWait: avg(table.map((t) => t.waitTime || 0)),
    avgTAT: avg(table.map((t) => t.turnaroundTime || 0)),
    avgService: avg(table.map((t) => t.serviceTime || 0)),
    avgResponse: avg(table.map((t) => t.responseTime || 0))
  };
  
  // Calculate priority-wise averages if priority is enabled
  let priorityWise = null;
  
  // Check if there are multiple priorities
  const uniquePriorities = [...new Set(table.map(t => t.priority))];
  if (uniquePriorities.length > 1) {
    priorityWise = {};
    
    uniquePriorities.forEach(priority => {
      const priorityTable = table.filter(t => t.priority === priority);
      if (priorityTable.length > 0) {
        priorityWise[`priority${priority}`] = {
          count: priorityTable.length,
          avgWait: avg(priorityTable.map(t => t.waitTime || 0)),
          avgTAT: avg(priorityTable.map(t => t.turnaroundTime || 0)),
          avgService: avg(priorityTable.map(t => t.serviceTime || 0)),
          avgResponse: avg(priorityTable.map(t => t.responseTime || 0)),
          percentage: ((priorityTable.length / table.length) * 100).toFixed(1),
          // Server distribution for M/M/C
          serverDistribution: ganttChart ? calculateServerDistribution(ganttChart, priorityTable) : null
        };
      }
    });
  }
  
  // Calculate priority distribution
  const priorityDistribution = {};
  uniquePriorities.forEach(priority => {
    const count = table.filter(t => t.priority === priority).length;
    priorityDistribution[`priority${priority}`] = {
      count,
      percentage: ((count / table.length) * 100).toFixed(1)
    };
  });
  
  // Calculate server-wise performance for M/M/C
  let serverWise = null;
  if (ganttChart) {
    const uniqueServers = [...new Set(table.map(t => t.server))].sort();
    serverWise = {};
    
    uniqueServers.forEach(server => {
      const serverTable = table.filter(t => t.server === server);
      if (serverTable.length > 0) {
        serverWise[`server${server}`] = {
          count: serverTable.length,
          avgWait: avg(serverTable.map(t => t.waitTime || 0)),
          avgTAT: avg(serverTable.map(t => t.turnaroundTime || 0)),
          avgService: avg(serverTable.map(t => t.serviceTime || 0)),
          avgResponse: avg(serverTable.map(t => t.responseTime || 0)),
          percentage: ((serverTable.length / table.length) * 100).toFixed(1)
        };
      }
    });
  }
  
  return {
    ...overall,
    priorityWise,
    priorityDistribution,
    serverWise,
    totalCustomers: table.length,
    uniquePriorities: uniquePriorities.length,
    uniqueServers: ganttChart ? [...new Set(table.map(t => t.server))].length : 1
  };
}

// Helper function to calculate server distribution for each priority
function calculateServerDistribution(ganttChart, priorityTable) {
  const serverCount = {};
  
  priorityTable.forEach(customer => {
    // Find which server served this customer
    const serverSegment = ganttChart.find(seg => seg.id === customer.serialNumber - 1);
    if (serverSegment) {
      const server = serverSegment.server;
      serverCount[server] = (serverCount[server] || 0) + 1;
    }
  });
  
  // Convert to percentages
  const total = priorityTable.length;
  const distribution = {};
  Object.entries(serverCount).forEach(([server, count]) => {
    distribution[`server${server}`] = ((count / total) * 100).toFixed(1);
  });
  
  return distribution;
}

// ===================== COMPONENT =====================

export default function MM1() {
  const [lambda, setLambda] = useState(3.96);
  const [mu, setMu] = useState(5);
  const [pMin, setPMin] = useState(1);
  const [pMax, setPMax] = useState(3);
  const [prioOn, setPrioOn] = useState(true);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("form");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("waiting");
  const [summary, setSummary] = useState(null);

  const themeColors = ["#6D9197", "#2F575D", "#28363D"];

  // Run simulation automatically when component mounts or parameters change
  useEffect(() => {
    setTab("form")
  }, []); // Empty dependency array

const runSimulation = () => {
  const data = generateCummulativeProbability(
    lambda,
    mu,
    prioOn ? { a: pMin, b: pMax } : null,
    2 // Always use 2 servers for M/M/C
  );
  setResult(data);
  setTab("table");
  
  // Pass ganttChart to computeSummary for M/M/C
  const s = computeSummary(data.table, data.utilization, data.ganttChart);
  setSummary(s);
};
  const getPriorityGradient = (prio) => {
    if (prio === 1) return "bg-gradient-to-br from-[#6D9197] to-[#2F575D]";
    if (prio === 2) return "bg-gradient-to-br from-[#2F575D] to-[#28363D]";
    return "bg-gradient-to-br from-[#28363D] to-[#6D9197]";
  };

  // for continuous x-axis ticks under gantt
  const ganttAxisTicks = (gantt) => {
    if (!gantt || gantt.length === 0) return [];
    // collect unique starts and ends sorted
    const ticks = [];
    gantt.forEach((s) => {
      if (!ticks.includes(s.start)) ticks.push(s.start);
      if (!ticks.includes(s.end)) ticks.push(s.end);
    });
    ticks.sort((a, b) => a - b);
    return ticks;
  };

  // Function to group Gantt chart data by server
  const getGanttDataByServer = (ganttChart, serverCount) => {
    const serverData = Array(serverCount).fill(null).map(() => []);
    
    ganttChart.forEach((item) => {
      const serverIndex = item.server - 1;
      if (serverIndex < serverCount) {
        serverData[serverIndex].push(item);
      }
    });

    // Sort each server's data by start time
    serverData.forEach(server => {
      server.sort((a, b) => a.start - b.start);
    });
    
    return serverData;
  };

  return (
    <div className="min-h-screen bg-[#f3f7f8]">
    

      {/* TABS */}
      <nav className="bg-[#28363D] border-b shadow-sm w-full">
        <div className="flex w-full">
          {["form", "gantt", "table", "graphs", "calc"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-5 md:py-4 text-center font-semibold text-lg uppercase ${
                tab === t ? "bg-[#6D9197] text-white" : "bg-[#28363D] text-gray-200 hover:bg-[#2F575D]"
              } transition`}
            >
              {t === "form" ? "Input Params" : t === "gantt" ? "Gantt" : t === "table" ? "Table" : t === "graphs" ? "Graphs" : "Calculations"}
            </button>
          ))}
        </div>
      </nav>

      <main>
        {/* =============== FORM =============== */}
        {tab === "form" && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-7xl mx-auto border border-gray-100">
            
            {/* Main Title */}
            <h2 className="text-4xl font-extrabold text-center mb-10 text-[#2F575D] tracking-tight">
              M/M/C Priority Queue — Simulation Setup
            </h2>

            {/* FULL HORIZONTAL LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Side: Lambda, Mu, Priority Toggle */}
              <div className="lg:col-span-7 space-y-8">

                {/* Row 1: Lambda & Mu */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                      Arrival Rate (λ)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={lambda}
                      onChange={(e) => setLambda(+e.target.value)}
                      className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#6D9197]/30 rounded-2xl focus:border-[#6D9197] focus:ring-4 focus:ring-[#6D9197]/20 
                               transition-all duration-300 shadow-inner"
                      placeholder="3.96"
                    />
                    <p className="mt-2 text-xs text-gray-600 text-center font-medium">Customers arriving per unit time</p>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                      Service Rate (μ)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={mu}
                      onChange={(e) => setMu(+e.target.value)}
                      className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#2F575D]/30 rounded-2xl focus:border-[#2F575D] focus:ring-4 focus:ring-[#2F575D]/20 
                               transition-all duration-300 shadow-inner"
                      placeholder="5.00"
                    />
                    <p className="mt-2 text-xs text-gray-600 text-center font-medium">Customers served per unit time</p>
                  </div>
                </div>

                {/* Row 2: Priority Toggle */}
                <div className="bg-gradient-to-r from-[#6D9197]/10 to-[#2F575D]/10 rounded-3xl p-8 border border-[#6D9197]/20">
                  <label className="flex items-center justify-center gap-6 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prioOn}
                      onChange={(e) => setPrioOn(e.target.checked)}
                      className="w-12 h-12 rounded-2xl accent-[#6D9197] focus:ring-8 focus:ring-[#6D9197]/30 
                               transition-all duration-300 hover:scale-110"
                    />
                    <div className="text-center">
                      <div className="text-3xl font-black text-[#28363D]">
                        {prioOn ? "Priority Queue: ENABLED" : "Priority Queue: DISABLED"}
                      </div>
                      <p className="mt-2 text-sm text-gray-700 font-medium">
                        Lower number = Higher priority · Preemptive scheduling
                      </p>
                    </div>
                  </label>
                </div>

              </div>

              {/* Right Side: Priority Range + Run Button */}
              <div className="lg:col-span-5 space-y-8">

                {/* Priority Range Box */}
                {prioOn && (
                  <div className="bg-[#28363D]/5 border-2 border-dashed border-[#28363D]/30 rounded-3xl p-8">
                    <h3 className="text-2xl font-bold text-center text-[#2F575D] mb-6">Priority Levels</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <label className="block text-sm font-bold text-green-700 uppercase mb-3">
                          Highest Priority
                        </label>
                        <input
                          type="number"
                          value={pMin}
                          onChange={(e) => setPMin(+e.target.value)}
                          className="w-full px-6 py-5 text-3xl font-black text-center bg-green-50 border-4 border-green-600 
                                   rounded-2xl focus:ring-8 focus:ring-green-300 transition-all"
                          min="1"
                        />
                        <p className="mt-2 text-xs text-green-800 font-bold">Lowest Number</p>
                      </div>
                      <div className="text-center">
                        <label className="block text-sm font-bold text-red-700 uppercase mb-3">
                          Lowest Priority
                        </label>
                        <input
                          type="number"
                          value={pMax}
                          onChange={(e) => setPMax(+e.target.value)}
                          className="w-full px-6 py-5 text-3xl font-black text-center bg-red-50 border-4 border-red-600 
                                   rounded-2xl focus:ring-8 focus:ring-red-300 transition-all"
                          min={pMin || 1}
                        />
                        <p className="mt-2 text-xs text-red-800 font-bold">Highest Number</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Run Button - Full Height */}
                <div className="flex items-center justify-center h-full min-h-48">
                  <button
                    onClick={runSimulation}
                    className="group relative w-full max-w-xl px-10 py-10 text-4xl font-extrabold text-white 
                             bg-gradient-to-r from-[#6D9197] via-[#2F575D] to-[#28363D] 
                             rounded-3xl shadow-2xl hover:shadow-[#6D9197]/60 
                             transform hover:scale-105 active:scale-95 transition-all duration-500 
                             overflow-hidden"
                  >
                    <span className="relative z-10 drop-shadow-2xl">RUN SIMULATION</span>
                    <div className="absolute inset-0 bg-gradient-to-l from-[#28363D] to-[#6D9197] 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-[#6D9197] to-[#2F575D] 
                                  blur-2xl opacity-30 group-hover:opacity-70 transition-opacity"></div>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* =============== GANTT CHART =============== */}
        {tab === "gantt" && result && (
          <div className="bg-white rounded-2xl shadow-xl my-8 p-8 border overflow-auto max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-[#2F575D]">
              Gantt Chart
            </h2>

            {/* Server 1 */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-center mb-6 text-[#2F575D] bg-[#6D9197] text-white py-3 rounded-lg">
                Server 1
              </h3>
              
              <div className="flex gap-6 items-end justify-start min-w-max py-6 bg-gray-50 rounded-xl px-4">
                {result.ganttChart
                  .filter(seg => seg.server === 1)
                  .map((seg, i) => {
                    const server1Segments = result.ganttChart.filter(s => s.server === 1);
                    const makespan = server1Segments.length > 0 ? 
                      Math.max(...server1Segments.map(s => s.end)) : 1;
                    const widthPercent = Math.max((seg.dur / makespan) * 100, 6);
                    
                    return (
                      <div key={i} className="relative text-center" style={{ minWidth: `${widthPercent * 2}px` }}>
                        {seg.preempted && (
                          <div className="absolute left-1/2 -translate-x-1/2 -top-12 animate-pulse scale-105">
                            <span className="bg-[#28363D] text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg ring-2 ring-[#2F575D] ring-opacity-70">
                              PREEMPTED!
                            </span>
                          </div>
                        )}

                        <div
                          className={`rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-md transition-all ${
                            seg.idle 
                              ? "bg-gray-400 border-2 border-dashed border-gray-500" 
                              : getPriorityGradient(seg.prio)
                          } ${seg.preempted ? "animate-pulse ring-2 ring-[#2F575D] ring-opacity-70 scale-105" : "hover:scale-105 hover:shadow-lg"}`}
                          style={{ width: Math.max(widthPercent * 3, 80), height: 96 }}
                        >
                          <div className="text-2xl font-black">
                            {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                          </div>
                          {!seg.idle && (
                            <>
                              <div className="text-xs opacity-90 mt-1">Prio: {seg.prio}</div>
                              <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">{seg.dur}</div>
                            </>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="text-sm text-[#2F575D] font-semibold">{seg.start}</div>
                          <div className="w-1 h-8 bg-gray-300 mx-auto my-1"></div>
                          <div className="text-sm text-[#28363D] font-semibold">{seg.end}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Server 2 */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-center mb-6 text-[#2F575D] bg-[#2F575D] text-white py-3 rounded-lg">
                Server 2
              </h3>
              
              <div className="flex gap-6 items-end justify-start min-w-max py-6 bg-gray-50 rounded-xl px-4">
                {result.ganttChart
                  .filter(seg => seg.server === 2)
                  .map((seg, i) => {
                    const server2Segments = result.ganttChart.filter(s => s.server === 2);
                    const makespan = server2Segments.length > 0 ? 
                      Math.max(...server2Segments.map(s => s.end)) : 1;
                    const widthPercent = Math.max((seg.dur / makespan) * 100, 6);
                    
                    return (
                      <div key={i} className="relative text-center" style={{ minWidth: `${widthPercent * 2}px` }}>
                        {seg.preempted && (
                          <div className="absolute left-1/2 -translate-x-1/2 -top-12 animate-pulse scale-105">
                            <span className="bg-[#28363D] text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg ring-2 ring-[#2F575D] ring-opacity-70">
                              PREEMPTED!
                            </span>
                          </div>
                        )}

                        <div
                          className={`rounded-xl text-white font-bold flex flex-col items-center justify-center shadow-md transition-all ${
                            seg.idle 
                              ? "bg-gray-400 border-2 border-dashed border-gray-500" 
                              : getPriorityGradient(seg.prio)
                          } ${seg.preempted ? "animate-pulse ring-2 ring-[#2F575D] ring-opacity-70 scale-105" : "hover:scale-105 hover:shadow-lg"}`}
                          style={{ width: Math.max(widthPercent * 3, 80), height: 96 }}
                        >
                          <div className="text-2xl font-black">
                            {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                          </div>
                          {!seg.idle && (
                            <>
                              <div className="text-xs opacity-90 mt-1">Prio: {seg.prio}</div>
                              <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">{seg.dur}</div>
                            </>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="text-sm text-[#2F575D] font-semibold">{seg.start}</div>
                          <div className="w-1 h-8 bg-gray-300 mx-auto my-1"></div>
                          <div className="text-sm text-[#28363D] font-semibold">{seg.end}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="text-lg font-bold text-yellow-800 mb-2">Legend:</h4>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#6D9197] to-[#2F575D] rounded"></div>
                  <span className="text-sm">Priority 1 (Highest)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#2F575D] to-[#28363D] rounded"></div>
                  <span className="text-sm">Priority 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#28363D] to-[#6D9197] rounded"></div>
                  <span className="text-sm">Priority 3+</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-400 border-2 border-dashed border-gray-500 rounded"></div>
                  <span className="text-sm">Idle Time</span>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-500 mt-4 text-sm">
              Scroll horizontally to see all processes →
            </p>
          </div>
        )}

        {/* =============== TABLE =============== */}
        {tab === "table" && result && (
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden my-8 border w-full max-w-8xl mx-auto">
            <div className="bg-[#2F575D] text-white p-6">
              <h2 className="text-3xl font-bold">Results Table</h2>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-center table-auto text-lg">
                <thead className="bg-[#6D9197]/80">
                  <tr>
                    {[
                      "Serial Number",
                      "Cp Lookup",
                      "Cp",
                      "Avg Time Between Arrival",
                      "Inter Arrival",
                      "Arrival Time",
                      "Priority",
                      "Service Time",
                      "Start Time",
                      "End Time",
                      "Turnaround Time",
                      "Wait Time",
                      "Response Time",
                      "Server"
                    ].map((h) => (
                      <th
                        key={h}
                        className="py-4 px-3 font-bold text-lg border border-[#2F575D]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {result.table.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b hover:bg-[#6D9197]/20 transition text-lg"
                    >
                      <td className="py-3 px-3 font-bold text-lg text-[#2F575D]">{r.serialNumber}</td>
                      <td className="py-3 px-3">{r.cpLookup.toFixed(6)}</td>
                      <td className="py-3 px-3">{r.cp.toFixed(6)}</td>
                      <td className="py-3 px-3">{r.avgTimeBetweenArrival}</td>
                      <td className="py-3 px-3">{r.interArrival}</td>
                      <td className="py-3 px-3">{r.arrivalTime}</td>
                      <td className="py-3 px-3">
                        <span className={`px-3 py-1 rounded-full text-white font-bold ${
                          r.priority === 1 ? 'bg-[#6D9197]' : 
                          r.priority === 2 ? 'bg-[#2F575D]' : 
                          'bg-[#28363D]'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">{r.serviceTime}</td>
                      <td className="py-3 px-3 text-[#2F575D] font-bold">{r.startTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#28363D] font-bold">{r.endTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#6D9197] font-bold">{r.turnaroundTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#6D9197] font-bold">{r.waitTime.toFixed(2)}</td>
                      <td className="py-3 px-3 text-[#2F575D] font-bold">{r.responseTime.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold">{r.server}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============== GRAPHS =============== */}
        {tab === "graphs" && result && (
          <div className="bg-white rounded-xl shadow-2xl my-10 border w-full max-w-7xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white p-8">
              <h2 className="text-3xl font-bold">Performance Analytics</h2>
            </div>

            <div className="grid grid-cols-12">
              {/* LEFT PANEL */}
              <div className="col-span-3 bg-[#28363D] text-white p-10 border-r min-h-[70vh]">
                <h3 className="text-xl font-bold mb-6">Graph Options</h3>

                <label className="text-lg font-semibold">Graph Type</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="mt-3 w-full px-6 py-4 rounded-xl bg-[#6D9197] text-white shadow"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>

                <label className="text-lg font-semibold mt-10 block">Select Metric</label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="mt-3 w-full px-6 py-4 rounded-xl bg-[#6D9197] text-white shadow"
                >
                  <option value="waiting">Waiting Time</option>
                  <option value="response">Response Time</option>
                  <option value="tat">Turnaround Time</option>
                  <option value="endTime">End Time</option>
                </select>

                <div className="mt-8 text-sm text-gray-100">
                  <p><strong>Note:</strong> Response Time = Start - Arrival</p>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="col-span-9 bg-white p-10 min-h-[70vh]">
                <div className="w-full h-[65vh] bg-[#f3f7f8] rounded-2xl p-6 shadow-inner overflow-auto">
                  {(() => {
                    const labels = result.table.map((r) => `P${r.serialNumber}`);

                    let dataForMetric;
                    if (metric === "waiting") {
                      dataForMetric = result.table.map((r) => parseFloat(r.waitTime.toFixed(2)));
                    } else if (metric === "response") {
                      dataForMetric = result.table.map((r) => parseFloat(r.responseTime.toFixed(2)));
                    } else if (metric === "tat") {
                      dataForMetric = result.table.map((r) => parseFloat(r.turnaroundTime.toFixed(2)));
                    } else if (metric === "endTime") {
                      // Y-axis boxes according to ending time
                      dataForMetric = result.table.map((r) => parseFloat(r.endTime.toFixed(2)));
                    }

                    const maxVal = Math.max(...dataForMetric) + 2; // padding top

                    const dataset = {
                      labels,
                      datasets: [
                        {
                          label: metric === "endTime" ? "End Time" : metric,
                          data: dataForMetric,
                          backgroundColor: result.table.map((r) =>
                            r.priority === 1 ? themeColors[0] : r.priority === 2 ? themeColors[1] : themeColors[2]
                          ),
                          borderColor: "#000",
                          borderWidth: 1,
                        }
                      ]
                    };

                    const options = {
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: maxVal,
                          ticks: {
                            stepSize: 1
                          },
                          title: {
                            display: true,
                            text: metric === "endTime" ? "End Time" : 
                                  metric === "waiting" ? "Waiting Time" :
                                  metric === "response" ? "Response Time" :
                                  "Turnaround Time",
                            font: {
                              size: 16,
                              weight: "bold"
                            }
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Processes",
                            font: { size: 16, weight: "bold" }
                          }
                        }
                      }
                    };

                    return chartType === "bar" ? <Bar data={dataset} options={options} /> :
                           chartType === "line" ? <Line data={dataset} options={options} /> :
                           <Pie
                             data={{
                               labels,
                               datasets: [
                                 {
                                   data: dataForMetric,
                                   backgroundColor: result.table.map((r) =>
                                     r.priority === 1 ? themeColors[0] : r.priority === 2 ? themeColors[1] : themeColors[2]
                                   )
                                 }
                               ]
                             }}
                             options={{ responsive: true }}
                           />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

{tab === "calc" && summary && result && (
  <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
    <h2 className="text-3xl font-bold text-center mb-8 text-[#2F575D]">Performance Calculations</h2>

    {/* Server Utilization Cards - M/M/C */}
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Server Utilization</h3>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-[#6D9197] to-[#2F575D] text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Server 1 Utilization</h3>
              <div className="text-5xl font-black mt-4">{calculateServerUtilization(result.ganttChart, 1)}%</div>
              <p className="mt-2 text-lg opacity-90">Percentage of time Server 1 is busy</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{summary.totalCustomers}</div>
              <p className="text-lg">Total Customers</p>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-gradient-to-br from-[#2F575D] to-[#28363D] text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Server 2 Utilization</h3>
              <div className="text-5xl font-black mt-4">{calculateServerUtilization(result.ganttChart, 2)}%</div>
              <p className="mt-2 text-lg opacity-90">Percentage of time Server 2 is busy</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{summary.totalCustomers}</div>
              <p className="text-lg">Total Customers</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Overall Performance Metrics - M/M/C */}
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Overall Performance Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2F575D] to-[#28363D] text-white shadow-lg">
          <h3 className="text-lg font-semibold">Avg Waiting Time</h3>
          <div className="text-4xl font-black mt-4">{summary.avgWait}</div>
          <p className="mt-2 text-sm opacity-90">Average wait time</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#6D9197] to-[#28363D] text-white shadow-lg">
          <h3 className="text-lg font-semibold">Avg Turnaround Time</h3>
          <div className="text-4xl font-black mt-4">{summary.avgTAT}</div>
          <p className="mt-2 text-sm opacity-90">Average completion time</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#28363D] to-[#2F575D] text-white shadow-lg">
          <h3 className="text-lg font-semibold">Avg Service Time</h3>
          <div className="text-4xl font-black mt-4">{summary.avgService}</div>
          <p className="mt-2 text-sm opacity-90">Average service time</p>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#6D9197] to-[#2F575D] text-white shadow-lg">
          <h3 className="text-lg font-semibold">Avg Response Time</h3>
          <div className="text-4xl font-black mt-4">{summary.avgResponse}</div>
          <p className="mt-2 text-sm opacity-90">Average response time</p>
        </div>
      </div>
    </div>

    {/* Priority Distribution - M/M/C */}
    {summary.priorityWise && (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[#2F575D]">Priority Distribution</h3>
          <div className="text-lg font-semibold text-[#2F575D]">
            Total: {summary.totalCustomers} Customers | {summary.uniquePriorities} Priority Levels
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(summary.priorityWise).map(([priorityKey, data]) => (
            <div key={priorityKey} className="p-6 rounded-2xl bg-gradient-to-br from-[#28363D] to-[#6D9197] text-white shadow-lg">
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-2">{priorityKey.replace('priority', 'Priority ')}</h3>
                <div className="text-3xl font-black">{data.count}</div>
                <div className="text-lg mt-1">Customers</div>
                <div className="text-xl font-bold mt-2 bg-white text-[#28363D] px-3 py-1 rounded-full">
                  {data.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Priority-wise Performance Table - M/M/C */}
    {summary.priorityWise && (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[#2F575D]">Priority-wise Performance</h3>
          <div className="text-lg font-semibold text-[#2F575D]">
            {summary.uniqueServers} Servers | M/M/C Queue
          </div>
        </div>
        
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white">
              <tr>
                <th className="py-5 px-6 text-left text-xl">Priority Level</th>
                <th className="py-5 px-6 text-center text-xl">Customers</th>
                <th className="py-5 px-6 text-center text-xl">Avg Wait Time</th>
                <th className="py-5 px-6 text-center text-xl">Avg Turnaround Time</th>
                <th className="py-5 px-6 text-center text-xl">Avg Service Time</th>
                <th className="py-5 px-6 text-center text-xl">Avg Response Time</th>
                <th className="py-5 px-6 text-center text-xl">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.priorityWise).map(([priorityKey, data]) => (
                <tr key={priorityKey} className="border-b hover:bg-gray-50 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        priorityKey === 'priority1' ? 'bg-[#6D9197]' : 
                        priorityKey === 'priority2' ? 'bg-[#2F575D]' : 
                        'bg-[#28363D]'
                      }`}>
                        {priorityKey.replace('priority', '')}
                      </span>
                      <span className="text-lg font-semibold">
                        {priorityKey === 'priority1' ? 'High Priority' : 
                         priorityKey === 'priority2' ? 'Medium Priority' : 
                         'Low Priority'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold">{data.count}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold text-[#6D9197]">{data.avgWait}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold text-[#2F575D]">{data.avgTAT}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold text-[#28363D]">{data.avgService}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold text-[#6D9197]">{data.avgResponse}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="text-2xl font-bold">{data.percentage}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Performance Insights - M/M/C */}
    <div className="mt-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Performance Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-[#f3f7f8] to-white rounded-2xl border border-[#6D9197] shadow">
          <h4 className="text-xl font-bold text-[#2F575D] mb-4">System Efficiency</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg">Server 1 Utilization:</span>
              <span className="text-2xl font-bold text-[#6D9197]">{calculateServerUtilization(result.ganttChart, 1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Server 2 Utilization:</span>
              <span className="text-2xl font-bold text-[#2F575D]">{calculateServerUtilization(result.ganttChart, 2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Avg Customer Throughput:</span>
              <span className="text-2xl font-bold text-[#28363D]">
                {((summary.totalCustomers / (result?.table[result.table.length - 1]?.endTime || 1)).toFixed(2))}
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gradient-to-br from-[#f3f7f8] to-white rounded-2xl border border-[#2F575D] shadow">
          <h4 className="text-xl font-bold text-[#2F575D] mb-4">Priority Analysis</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg">Priority Levels:</span>
              <span className="text-2xl font-bold text-[#28363D]">{summary.uniquePriorities}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Total Processes:</span>
              <span className="text-2xl font-bold text-[#6D9197]">{summary.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Number of Servers:</span>
              <span className="text-2xl font-bold text-[#2F575D]">{summary.uniqueServers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


      </main>
    </div>
  );
}