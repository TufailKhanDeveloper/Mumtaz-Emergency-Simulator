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

// ===================== HELPER FUNCTIONS =====================

function factorial(n) {
  if (n > 20) return Infinity;
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// M/G/1 Queue Simulator with Priority
function calculateScheduleMG1(arr, serv, prio) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    prio: prio[i],
    completed: false,
    startTime: null
  }));

  let serverAvailableTime = 0;
  let currentProcess = null;

  let iterations = 0;
  const maxIterations = 1000;

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < maxIterations) {
    iterations++;
    
    // Add newly arrived customers to queue
    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    // Sort queue by priority (lower number = higher priority)
    q.sort((a, b) => a.prio - b.prio);

    // Check if server is idle and can start a new process
    if (serverAvailableTime <= t && !currentProcess && q.length > 0) {
      const c = q.shift();
      
      // Record start time if this is the first time this process is being served
      if (c.startTime === null) {
        c.startTime = t;
      }
      
      // Calculate service duration
      const serve = c.rem;
      
      // Add to Gantt chart
      gantt.push({
        id: c.id,
        prio: c.prio,
        server: 1,
        start: +t.toFixed(2),
        end: +(t + serve).toFixed(2),
        dur: +serve.toFixed(2),
        preempted: false,
        idle: false
      });
      
      // Update server availability
      serverAvailableTime = t + serve;
      currentProcess = c;
      c.completed = true;
      c.rem = 0;
    }

    // Check for preemption if a higher priority process arrives
    if (currentProcess && q.length > 0 && q[0].prio < currentProcess.prio) {
      // Preempt the current process
      const preemptedProcess = currentProcess;
      const preemptTime = t;
      
      // Update the Gantt chart to show the preempted segment
      const lastGanttEntry = gantt[gantt.length - 1];
      if (lastGanttEntry && lastGanttEntry.id === preemptedProcess.id && !lastGanttEntry.preempted) {
        // Update the last entry to show it was preempted
        lastGanttEntry.end = +preemptTime.toFixed(2);
        lastGanttEntry.dur = +(preemptTime - lastGanttEntry.start).toFixed(2);
        lastGanttEntry.preempted = true;
      }
      
      // Update remaining service time for the preempted process
      preemptedProcess.rem = serverAvailableTime - preemptTime;
      preemptedProcess.completed = false;
      
      // Add the preempted process back to the queue
      q.push(preemptedProcess);
      
      // Reset server availability
      serverAvailableTime = preemptTime;
      currentProcess = null;
      
      // Add a preemption indicator to the Gantt chart
      gantt.push({
        id: -2, // Special ID for preemption indicator
        prio: 0,
        server: 1,
        start: +preemptTime.toFixed(2),
        end: +preemptTime.toFixed(2),
        dur: 0,
        preempted: true,
        idle: false
      });
    }

    // If server is busy, find the next event time
    if (currentProcess) {
      // Find the next arrival time
      const nextArrival = cust.find((c) => !c.completed && c.arr > t)?.arr || Infinity;
      
      // Move time to the next event
      t = Math.min(serverAvailableTime, nextArrival);
      
      // Check if current process completed
      if (serverAvailableTime <= t) {
        currentProcess = null;
      }
    } else if (q.length === 0) {
      // If queue is empty, find next arrival time
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        const nextArrivalTime = Math.min(...nextArrivals.map((c) => c.arr));
        
        // Add idle time to Gantt chart
        if (nextArrivalTime > t) {
          gantt.push({
            id: -1, // -1 indicates idle time
            prio: 0,
            server: 1,
            start: +t.toFixed(2),
            end: +nextArrivalTime.toFixed(2),
            dur: +(nextArrivalTime - t).toFixed(2),
            preempted: false,
            idle: true
          });
        }
        
        t = nextArrivalTime;
      } else {
        break;
      }
    } 
  }

  return gantt;
}

// M/G/2 Queue Simulator with Priority
function calculateScheduleMG2(arr, serv, prio) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    prio: prio[i],
    completed: false,
    startTime: null
  }));

  let serverAvailableTime = [0, 0]; // Two servers
  let currentProcess = [null, null]; // Current process on each server

  let iterations = 0;
  const maxIterations = 1000;

  while ((q.length > 0 || cust.some((c) => !c.completed)) && iterations < maxIterations) {
    iterations++;
    
    // Add newly arrived customers to queue
    cust
      .filter((c) => c.arr <= t && !c.completed && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    // Sort queue by priority (lower number = higher priority)
    q.sort((a, b) => a.prio - b.prio);

    // Check if any server is idle and can start a new process
    for (let s = 0; s < 2; s++) {
      if (serverAvailableTime[s] <= t && !currentProcess[s] && q.length > 0) {
        const c = q.shift();
        
        // Record start time if this is the first time this process is being served
        if (c.startTime === null) {
          c.startTime = t;
        }
        
        // Calculate service duration
        const serve = c.rem;
        
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
        
        // Update server availability
        serverAvailableTime[s] = t + serve;
        currentProcess[s] = c;
        c.completed = true;
        c.rem = 0;
      }
    }

    // Check for preemption if a higher priority process arrives
    if (q.length > 0) {
      for (let s = 0; s < 2; s++) {
        if (currentProcess[s] && q[0].prio < currentProcess[s].prio) {
          // Preempt the current process
          const preemptedProcess = currentProcess[s];
          const preemptTime = t;
          
          // Update the Gantt chart to show the preempted segment
          const lastGanttEntry = gantt.filter(g => g.server === s + 1).pop();
          if (lastGanttEntry && lastGanttEntry.id === preemptedProcess.id && !lastGanttEntry.preempted) {
            // Update the last entry to show it was preempted
            lastGanttEntry.end = +preemptTime.toFixed(2);
            lastGanttEntry.dur = +(preemptTime - lastGanttEntry.start).toFixed(2);
            lastGanttEntry.preempted = true;
          }
          
          // Update remaining service time for the preempted process
          preemptedProcess.rem = serverAvailableTime[s] - preemptTime;
          preemptedProcess.completed = false;
          
          // Add the preempted process back to the queue
          q.push(preemptedProcess);
          
          // Reset server availability
          serverAvailableTime[s] = preemptTime;
          currentProcess[s] = null;
          
          // Add a preemption indicator to the Gantt chart
          gantt.push({
            id: -2, // Special ID for preemption indicator
            prio: 0,
            server: s + 1,
            start: +preemptTime.toFixed(2),
            end: +preemptTime.toFixed(2),
            dur: 0,
            preempted: true,
            idle: false
          });
        }
      }
    }

    // If servers are busy, find the next event time
    if (currentProcess.some(p => p !== null)) {
      // Find the next completion time
      const nextCompletion = Math.min(
        ...currentProcess.map((p, i) => p ? serverAvailableTime[i] : Infinity)
      );
      
      // Find the next arrival time
      const nextArrival = cust.find((c) => !c.completed && c.arr > t)?.arr || Infinity;
      
      // Move time to the next event
      t = Math.min(nextCompletion, nextArrival);
      
      // Check if any process completed
      for (let s = 0; s < 2; s++) {
        if (currentProcess[s] && serverAvailableTime[s] <= t) {
          currentProcess[s] = null;
        }
      }
    } else if (q.length === 0) {
      // If queue is empty, find next arrival time
      const nextArrivals = cust.filter((c) => !c.completed && c.arr > t);
      if (nextArrivals.length > 0) {
        const nextArrivalTime = Math.min(...nextArrivals.map((c) => c.arr));
        
        // Add idle time to Gantt chart for both servers
        for (let s = 0; s < 2; s++) {
          if (nextArrivalTime > t && serverAvailableTime[s] <= t) {
            gantt.push({
              id: -1, // -1 indicates idle time
              prio: 0,
              server: s + 1,
              start: +t.toFixed(2),
              end: +nextArrivalTime.toFixed(2),
              dur: +(nextArrivalTime - t).toFixed(2),
              preempted: false,
              idle: true
            });
          }
        }
        
        t = nextArrivalTime;
      } else {
        break;
      }
    }
  }

  return gantt;
}

function generateCummulativeProbability(lambda, distributionType, params, priorityParams = null, numServers = 1) {
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

  // ========== FIXED CP GENERATION ==========
  const maxIterations = 5000;
  cpValues.length = 0;
  cpLookup.length = 0;
  
  // For large lambda, use Normal approximation instead of Poisson
  let cp = 0;
  let count = 0;
  
  if (lambda > 50) {
    // For large lambda, use exponential distribution for inter-arrival times directly
    // Instead of generating CP table, we'll generate inter-arrival times directly
    
    // Generate fixed number of customers
    const numCustomers = 500; // You can adjust this number
    
    // Generate inter-arrival times using exponential distribution
    let inter = [0];
    for (let i = 1; i < numCustomers; i++) {
      // Exponential distribution with mean 1/lambda
      const u = Math.random();
      const time = -Math.log(1 - u) / lambda;
      inter.push(Math.round(time * 100) / 100); // Round to 2 decimal places
    }
    
    // Generate CP lookup table for display (dummy values)
    for (let i = 0; i < numCustomers; i++) {
      cpLookup[i] = i / numCustomers;
      cpValues[i] = (i + 1) / numCustomers;
    }
    
    // Calculate arrival times from inter-arrival times
    let currentArrival = 0;
    arrivalTime.push(0);
    for (let i = 1; i < inter.length; i++) {
      currentArrival += inter[i];
      arrivalTime.push(Math.round(currentArrival * 100) / 100);
    }
    
    // Set interArrival array
    interArrival.push(...inter);
    
    // Generate service times
    for (let i = 0; i < numCustomers; i++) {
      let st;
      
      if (distributionType === "uniform") {
        let r = Math.random();
        st = Math.round(params.a + (params.b - params.a) * r);
      } else {
        let r1 = Math.random();
        let r2 = Math.random();
        st = Math.round(
          params.u + 
          params.sd * 
          Math.sqrt(-2 * Math.log(r1)) * 
          Math.cos(2 * Math.PI * r2)
        );
      }
      
      serviceTime.push(st < 1 ? 1 : st);
    }
    
  } else {
    // Original method for small lambda
    while (cp < 0.999999 && count < maxIterations) {
      let calc;
      
      // Use logarithms for numerical stability
      if (lambda > 10) {
        const logCalc = -lambda + count * Math.log(lambda);
        let logFact = 0;
        for (let i = 2; i <= count; i++) {
          logFact += Math.log(i);
        }
        calc = Math.exp(logCalc - logFact);
      } else {
        calc = Math.exp(-lambda) * Math.pow(lambda, count) / factorial(count);
      }
      
      cpLookup[count] = cp;
      cp = cp + calc;
      cpValues[count] = cp;
      
      if (calc < 1e-10) {
        cpValues[count] = 1;
        break;
      }
      
      count++;
    }
    
    // Ensure last value is exactly 1
    if (cpValues.length > 0) {
      cpValues[cpValues.length - 1] = 1;
      cpLookup[cpValues.length] = 1;
    }
    
    // Generate service times
    const numCustomers = cpValues.length;
    for (let i = 0; i < numCustomers; i++) {
      let st;
      
      if (distributionType === "uniform") {
        let r = Math.random();
        st = Math.round(params.a + (params.b - params.a) * r);
      } else {
        let r1 = Math.random();
        let r2 = Math.random();
        st = Math.round(
          params.u + 
          params.sd * 
          Math.sqrt(-2 * Math.log(r1)) * 
          Math.cos(2 * Math.PI * r2)
        );
      }
      
      serviceTime.push(st < 1 ? 1 : st);
    }
    
    // Generate inter-arrival times
    let inter = [0];
    for (let i = 1; i < numCustomers; i++) {
      let r = Math.random();
      let found = false;
      for (let j = 1; j < cpLookup.length; j++) {
        if (cpLookup[j - 1] <= r && r < cpLookup[j]) {
          inter.push(j);
          found = true;
          break;
        }
      }
      if (!found) inter.push(1);
    }
    
    // Calculate arrival times
    let currentArrival = 0;
    arrivalTime.push(0);
    for (let i = 1; i < inter.length; i++) {
      currentArrival += inter[i];
      arrivalTime.push(currentArrival);
    }
    
    interArrival.push(...inter);
  }
  // ========== END FIXED CP GENERATION ==========

  // Generate priority values
  const numCustomers = arrivalTime.length;
  if (priorityParams) {
    priority = [];
    for (let i = 0; i < numCustomers; i++) {
      let r = Math.random();
      priority.push(
        Math.round(priorityParams.a + r * (priorityParams.b - priorityParams.a))
      );
    }
  } else {
    priority = Array(numCustomers).fill(1);
  }

  // Calculate average time between arrivals
  for (let i = 0; i < arrivalTime.length; i++) {
    avgTimeBetweenArrival.push(i);
  }

  // Calculate schedule and performance measures
  const gantt = numServers === 1 ? 
    calculateScheduleMG1(arrivalTime, serviceTime, priority) :
    calculateScheduleMG2(arrivalTime, serviceTime, priority);
    
  performanceMeasures(arrivalTime, serviceTime, gantt, startTime, endingTime, waitingTime, turnAroundTime, server);

  // Calculate server utilization
  const totalServiceTime = serviceTime.reduce((a, b) => a + b, 0);
  const makespan = gantt.length > 0 ? gantt[gantt.length - 1]?.end || 1 : 1;

  const serverUtilizations = calculateServerUtilizations(gantt, numServers, makespan);
  const overallUtil = ((totalServiceTime / makespan) * 100).toFixed(1);

  // Create table - Make sure we have data for all customers
  table = [];
  for (let i = 0; i < numCustomers; i++) {
    table.push({
      serialNumber: i + 1,
      cpLookup: cpLookup[i] || 0,
      cp: cpValues[i] || (i + 1) / numCustomers,
      avgTimeBetweenArrival: avgTimeBetweenArrival[i] || 0,
      interArrival: interArrival[i] || 0,
      arrivalTime: arrivalTime[i] || 0,
      serviceTime: serviceTime[i] || 0,
      startTime: startTime[i] || 0,
      endTime: endingTime[i] || 0,
      turnaroundTime: turnAroundTime[i] || 0,
      waitTime: waitingTime[i] || 0,
      responseTime: waitingTime[i] || 0,
      server: server[i] || "Server 1",
      priority: priority[i] || 1
    });
  }

  return { 
    table, 
    ganttChart: gantt, 
    utilization: overallUtil,
    serverUtilizations 
  };
}

function calculateServerUtilizations(gantt, numServers, makespan) {
  const utilizations = {};
  
  for (let s = 1; s <= numServers; s++) {
    const serverSegments = gantt.filter(seg => seg.server === s && !seg.idle);
    const totalBusyTime = serverSegments.reduce((sum, seg) => sum + seg.dur, 0);
    const utilization = (totalBusyTime / makespan) * 100;
    utilizations[`server${s}`] = utilization.toFixed(1);
  }
  
  return utilizations;
}

function performanceMeasures(arr, serv, gantt, startTime, endingTime, waitingTime, turnAroundTime, server) {
  const first = {};
  const last = {};
  
  // Filter out idle segments for performance calculation
  const processSegments = gantt.filter(seg => !seg.idle && seg.id >= 0);
  
  processSegments.forEach((s) => {
    if (!first[s.id] || s.start < first[s.id]) first[s.id] = s.start;
    if (!last[s.id] || s.end > last[s.id]) last[s.id] = s.end;
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

function computeSummary(table, utilization, serverUtilizations = {}) {
  if (!table || table.length === 0) return null;
  
  // Helper function for average calculation
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  
  // Calculate overall averages
  const overall = {
    utilization,
    serverUtilizations,
    avgWait: avg(table.map((t) => t.waitTime || 0)),
    avgTAT: avg(table.map((t) => t.turnaroundTime || 0)),
    avgService: avg(table.map((t) => t.serviceTime || 0)),
    avgResponse: avg(table.map((t) => t.responseTime || 0))
  };
  
  // Calculate priority-wise averages
  let priorityWise = {};
  
  // Get unique priorities
  const uniquePriorities = [...new Set(table.map(t => t.priority))].sort((a, b) => a - b);
  
  // Calculate for each priority
  uniquePriorities.forEach(priority => {
    const priorityTable = table.filter(t => t.priority === priority);
    
    priorityWise[`priority${priority}`] = {
      count: priorityTable.length,
      avgWait: avg(priorityTable.map(t => t.waitTime || 0)),
      avgTAT: avg(priorityTable.map(t => t.turnaroundTime || 0)),
      avgService: avg(priorityTable.map(t => t.serviceTime || 0)),
      avgResponse: avg(priorityTable.map(t => t.responseTime || 0)),
      percentage: ((priorityTable.length / table.length) * 100).toFixed(1)
    };
  });
  
  // Calculate server-wise priority distribution (for M/G/C)
  let serverPriorityDistribution = {};
  const uniqueServers = [...new Set(table.map(t => t.server))].sort();
  
  uniqueServers.forEach(server => {
    const serverTable = table.filter(t => t.server === server);
    const serverPriorityCount = {};
    
    uniquePriorities.forEach(priority => {
      const count = serverTable.filter(t => t.priority === priority).length;
      if (count > 0) {
        serverPriorityCount[`priority${priority}`] = {
          count,
          percentage: ((count / serverTable.length) * 100).toFixed(1)
        };
      }
    });
    
    if (Object.keys(serverPriorityCount).length > 0) {
      serverPriorityDistribution[`server${server}`] = serverPriorityCount;
    }
  });
  
  return {
    ...overall,
    priorityWise,
    serverPriorityDistribution,
    totalCustomers: table.length,
    uniquePriorities: uniquePriorities.length,
    uniqueServers: uniqueServers.length
  };
}

// ===================== COMPONENT =====================

export default function MGCSimulation() {
  const [lambda, setLambda] = useState(3.96);
  const [distributionType, setDistributionType] = useState("uniform");
  const [uniformParams, setUniformParams] = useState({ a: 2, b: 8 });
  const [normalParams, setNormalParams] = useState({ u: 5, sd: 2 });
  const [numServers, setNumServers] = useState(2);
  const [pMin, setPMin] = useState(1);
  const [pMax, setPMax] = useState(3);
  const [prioOn, setPrioOn] = useState(true);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("form");
  const [chartType, setChartType] = useState("bar");
  const [metric, setMetric] = useState("waiting");
  const [summary, setSummary] = useState(null);

  const themeColors = ["#6D9197", "#2F575D", "#28363D"];

  useEffect(() => {
    setTab("form")
  }, []);

const runSimulation = () => {
  const params = distributionType === "uniform" ? uniformParams : normalParams;
  
  const data = generateCummulativeProbability(
    lambda,
    distributionType,
    params,
    prioOn ? { a: pMin, b: pMax } : null,
    numServers
  );
  setResult(data);
  setTab("table");
  
  // Updated computeSummary with all required data
  const s = computeSummary(data.table, data.utilization, data.serverUtilizations);
  setSummary(s);
};

  const getPriorityGradient = (prio) => {
    if (prio === 1) return "bg-gradient-to-br from-[#6D9197] to-[#2F575D]";
    if (prio === 2) return "bg-gradient-to-br from-[#2F575D] to-[#28363D]";
    return "bg-gradient-to-br from-[#28363D] to-[#6D9197]";
  };

  const ganttAxisTicks = (gantt) => {
    if (!gantt || gantt.length === 0) return [];
    const ticks = [];
    gantt.forEach((s) => {
      if (!ticks.includes(s.start)) ticks.push(s.start);
      if (!ticks.includes(s.end)) ticks.push(s.end);
    });
    ticks.sort((a, b) => a - b);
    return ticks;
  };

  const getGanttDataByServer = (ganttChart, serverCount) => {
    const serverData = Array(serverCount).fill(null).map(() => []);
    
    ganttChart.forEach((item) => {
      const serverIndex = item.server - 1;
      if (serverIndex < serverCount) {
        serverData[serverIndex].push(item);
      }
    });

    serverData.forEach(server => {
      server.sort((a, b) => a.start - b.start);
    });
    
    return serverData;
  };

  return (
    <div className="min-h-screen bg-[#f3f7f8]">
    

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
            <h2 className="text-4xl font-extrabold text-center mb-10 text-[#2F575D] tracking-tight">
              M/G/C Priority Queue — Simulation Setup
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                      Service Distribution
                    </label>
                    <select
                      value={distributionType}
                      onChange={(e) => setDistributionType(e.target.value)}
                      className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#2F575D]/30 rounded-2xl focus:border-[#2F575D] focus:ring-4 focus:ring-[#2F575D]/20 
                               transition-all duration-300 shadow-inner"
                    >
                      <option value="uniform">Uniform Distribution</option>
                      <option value="normal">Normal Distribution</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-600 text-center font-medium">Select service time distribution</p>
                  </div>

                  {distributionType === "uniform" ? (
                    <>
                      <div className="group">
                        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                          Service Min (a)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={uniformParams.a}
                          onChange={(e) => setUniformParams({...uniformParams, a: +e.target.value})}
                          className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                                   transition-all duration-300 shadow-inner"
                          placeholder="2"
                        />
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">Minimum service time</p>
                      </div>
                      <div className="group">
                        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                          Service Max (b)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={uniformParams.b}
                          onChange={(e) => setUniformParams({...uniformParams, b: +e.target.value})}
                          className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                                   transition-all duration-300 shadow-inner"
                          placeholder="8"
                        />
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">Maximum service time</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="group">
                        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                          Mean (μ)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={normalParams.u}
                          onChange={(e) => setNormalParams({...normalParams, u: +e.target.value})}
                          className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                                   transition-all duration-300 shadow-inner"
                          placeholder="5"
                        />
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">Average service time</p>
                      </div>
                      <div className="group">
                        <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                          Std Dev (σ)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={normalParams.sd}
                          onChange={(e) => setNormalParams({...normalParams, sd: +e.target.value})}
                          className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                                   border-2 border-[#28363D]/30 rounded-2xl focus:border-[#28363D] focus:ring-4 focus:ring-[#28363D]/20 
                                   transition-all duration-300 shadow-inner"
                          placeholder="2"
                        />
                        <p className="mt-2 text-xs text-gray-600 text-center font-medium">Standard deviation</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Rest of the form remains the same */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="block text-sm font-bold text-[#28363D] uppercase tracking-wider mb-3">
                      Number of Servers
                    </label>
                    <select
                      value={numServers}
                      onChange={(e) => setNumServers(+e.target.value)}
                      className="w-full px-8 py-6 text-2xl font-bold text-center bg-gradient-to-b from-gray-50 to-gray-100 
                               border-2 border-[#6D9197]/30 rounded-2xl focus:border-[#6D9197] focus:ring-4 focus:ring-[#6D9197]/20 
                               transition-all duration-300 shadow-inner"
                    >
                      <option value={1}>1 Server</option>
                      <option value={2}>2 Servers</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-600 text-center font-medium">Select number of servers</p>
                  </div>

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
              </div>

              {/* Right side with priority and run button remains the same */}
              <div className="lg:col-span-5 space-y-8">
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

            {Array.from({ length: numServers }, (_, serverIndex) => {
              const serverData = getGanttDataByServer(result.ganttChart, numServers)[serverIndex] || [];
              const makespan = serverData.length > 0 ? 
                Math.max(...serverData.map(s => s.end)) : 1;
              
              return (
                <div key={serverIndex} className="mb-12">
                  <h3 className="text-xl font-bold text-center mb-6 text-[#2F575D] bg-[#6D9197] text-white py-3 rounded-lg">
                    Server {serverIndex + 1}
                  </h3>
                  
                  <div className="flex gap-4 items-end justify-start min-w-max py-6 bg-gray-50 rounded-xl px-4">
                    {serverData.map((seg, i) => {
                      if(seg.dur=== 0) return null; 
                      const widthPercent = Math.max((seg.dur / makespan) * 100, 4);
                      return (
                        <div key={i} className="relative text-center" style={{ minWidth: `${widthPercent * 3}px` }}>
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
                            style={{ 
                              width: Math.max(widthPercent * 4, 80), 
                              height: seg.idle ? 70 : 96 
                            }}
                          >
                            <div className="text-2xl font-black">
                              {seg.idle ? "IDLE" : `P${seg.id + 1}`}
                            </div>
                            {!seg.idle && (
                              <>
                                <div className="text-xs opacity-90 mt-1">Prio: {seg.prio}</div>
                                <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">{seg.dur }</div>
                              </>
                            )}
                            {seg.idle && (
                              <div className="text-sm font-bold bg-black bg-opacity-40 px-3 py-1 rounded mt-2">{seg.dur}</div>
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
              );
            })}

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
                      dataForMetric = result.table.map((r) => parseFloat(r.endTime.toFixed(2)));
                    }

                    const maxVal = Math.max(...dataForMetric) + 2;

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

        {/* =============== CALCULATIONS =============== */}
       {tab === "calc" && summary && result && (
  <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
    <h2 className="text-3xl font-bold text-center mb-8 text-[#2F575D]">Performance Calculations</h2>

    {/* Server Utilization Cards - M/G/C */}
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Server Utilization</h3>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-[#6D9197] to-[#2F575D] text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Server 1 Utilization</h3>
              <div className="text-5xl font-black mt-4">{summary.serverUtilizations.server1 || "0.0"}%</div>
              <p className="mt-2 text-lg opacity-90">Percentage of time Server 1 is busy</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{summary.totalCustomers}</div>
              <p className="text-lg">Total Customers</p>
            </div>
          </div>
        </div>

        {numServers >= 2 && (
          <div className="p-8 rounded-2xl bg-gradient-to-br from-[#2F575D] to-[#28363D] text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold">Server 2 Utilization</h3>
                <div className="text-5xl font-black mt-4">{summary.serverUtilizations.server2 || "0.0"}%</div>
                <p className="mt-2 text-lg opacity-90">Percentage of time Server 2 is busy</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{summary.totalCustomers}</div>
                <p className="text-lg">Total Customers</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Overall Performance Metrics - M/G/C */}
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

    {/* Priority Distribution - M/G/C */}
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

    {/* Priority-wise Performance Table - M/G/C */}
    {summary.priorityWise && (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[#2F575D]">Priority-wise Performance</h3>
          <div className="text-lg font-semibold text-[#2F575D]">
            {summary.uniqueServers} Servers | M/G/C Queue
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

    {/* Performance Insights - M/G/C */}
    <div className="mt-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Performance Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-[#f3f7f8] to-white rounded-2xl border border-[#6D9197] shadow">
          <h4 className="text-xl font-bold text-[#2F575D] mb-4">System Efficiency</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg">Server 1 Utilization:</span>
              <span className="text-2xl font-bold text-[#6D9197]">{summary.serverUtilizations.server1 || "0.0"}%</span>
            </div>
            {numServers >= 2 && (
              <div className="flex justify-between items-center">
                <span className="text-lg">Server 2 Utilization:</span>
                <span className="text-2xl font-bold text-[#2F575D]">{summary.serverUtilizations.server2 || "0.0"}%</span>
              </div>
            )}
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