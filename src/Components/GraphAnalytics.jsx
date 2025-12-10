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

// Generate random numbers from different distributions
function generateRandomFromDistribution(distributionType, params) {
  if (distributionType === "uniform") {
    // Uniform distribution: a + (b-a)*Random
    return Math.max(0.1, params.a + (params.b - params.a) * Math.random());
  } else if (distributionType === "normal") {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return Math.max(0.1, params.mean + params.stdDev * z0);
  } else if (distributionType === "exponential") {
    // Exponential distribution: -ln(1-r)/λ
    return Math.max(0.1, -Math.log(1 - Math.random()) / params.lambda);
  }
  return 0.1;
}

// Generate arrival times and inter-arrival times
function generateArrivalTimes(inputType, inputData, arrivalDistribution, arrivalParams) {
  let arrivalTimes = [0]; // First customer arrives at time 0
  let interArrivalTimes = [0]; // First customer has no inter-arrival
  
  if (inputType === "customerCount") {
    // Generate fixed number of customers
    const numCustomers = parseInt(inputData.count) || 10;
    
    for (let i = 1; i < numCustomers; i++) {
      const interArrival = generateRandomFromDistribution(arrivalDistribution, arrivalParams);
      interArrivalTimes.push(interArrival);
      arrivalTimes.push(arrivalTimes[i - 1] + interArrival);
    }
  } else {
    // Generate based on time range - stop when total arrival time exceeds duration
    const totalDuration = (parseInt(inputData.endHours) * 60 + parseInt(inputData.endMinutes)) - 
                         (parseInt(inputData.startHours) * 60 + parseInt(inputData.startMinutes));
    
    let currentTime = 0;
    let customerCount = 1;
    
    // Generate customers until we exceed time range
    while (currentTime <= totalDuration && customerCount < 1000) {
      const interArrival = generateRandomFromDistribution(arrivalDistribution, arrivalParams);
      currentTime += interArrival;
      
      // Only add if within time range
      if (currentTime <= totalDuration) {
        interArrivalTimes.push(interArrival);
        arrivalTimes.push(currentTime);
        customerCount++;
      } else {
        break;
      }
    }
  }
  
  return { arrivalTimes, interArrivalTimes };
}

// Generate service times
function generateServiceTimes(numCustomers, serviceDistribution, serviceParams) {
  const serviceTimes = [];
  for (let i = 0; i < numCustomers; i++) {
    const serviceTime = generateRandomFromDistribution(serviceDistribution, serviceParams);
    // Round service time to 2 decimal places
    serviceTimes.push(Math.max(0.1, Math.round(serviceTime * 100) / 100));
  }
  return serviceTimes;
}
// Calculate schedule for M/G/1 queue with preemptive priority
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
    startTime: null,
    firstStartTime: null
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
      if (c.firstStartTime === null) {
        c.firstStartTime = t;
      }
      c.startTime = t;
      
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
      // Preempt current process
      const preemptedProcess = currentProcess;
      const preemptTime = t;
      
      // Update Gantt chart to show preempted segment
      const lastGanttEntry = gantt[gantt.length - 1];
      if (lastGanttEntry && lastGanttEntry.id === preemptedProcess.id && !lastGanttEntry.preempted) {
        // Update last entry to show it was preempted
        lastGanttEntry.end = +preemptTime.toFixed(2);
        lastGanttEntry.dur = +(preemptTime - lastGanttEntry.start).toFixed(2);
        lastGanttEntry.preempted = true;
      }
      
      // Update remaining service time for preempted process
      preemptedProcess.rem = serverAvailableTime - preemptTime;
      preemptedProcess.completed = false;
      
      // Add preempted process back to queue
      q.push(preemptedProcess);
      
      // Reset server availability
      serverAvailableTime = preemptTime;
      currentProcess = null;
      
      // Add a preemption indicator to Gantt chart
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
      // If queue is empty, find the next arrival time
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

// Calculate schedule for M/G/2 queue with preemptive priority
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
    startTime: null,
    firstStartTime: null
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
        if (c.firstStartTime === null) {
          c.firstStartTime = t;
        }
        c.startTime = t;
        
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
          // Preempt current process
          const preemptedProcess = currentProcess[s];
          const preemptTime = t;
          
          // Update Gantt chart to show preempted segment
          const lastGanttEntry = gantt.filter(g => g.server === s + 1).pop();
          if (lastGanttEntry && lastGanttEntry.id === preemptedProcess.id && !lastGanttEntry.preempted) {
            // Update last entry to show it was preempted
            lastGanttEntry.end = +preemptTime.toFixed(2);
            lastGanttEntry.dur = +(preemptTime - lastGanttEntry.start).toFixed(2);
            lastGanttEntry.preempted = true;
          }
          
          // Update remaining service time for preempted process
          preemptedProcess.rem = serverAvailableTime[s] - preemptTime;
          preemptedProcess.completed = false;
          
          // Add preempted process back to queue
          q.push(preemptedProcess);
          
          // Reset server availability
          serverAvailableTime[s] = preemptTime;
          currentProcess[s] = null;
          
          // Add a preemption indicator to Gantt chart
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
      // If queue is empty, find the next arrival time
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

// Calculate performance measures
function performanceMeasures(arr, serv, gantt) {
  const first = {};
  const last = {};
  const startTime = [];
  const endingTime = [];
  const waitingTime = [];
  const turnAroundTime = [];
  const server = [];
  const firstStartTime = [];

  // Filter out idle segments for performance calculation
  const processSegments = gantt.filter(seg => !seg.idle && seg.id >= 0);
  
  processSegments.forEach((s) => {
    if (!first[s.id] || s.start < first[s.id]) {
      first[s.id] = s.start;
      if (!firstStartTime[s.id]) {
        firstStartTime[s.id] = s.start;
      }
    }
    if (!last[s.id] || s.end > last[s.id]) {
      last[s.id] = s.end;
    }
  });

  Object.keys(first).forEach((id) => {
    const i = +id;
    startTime[i] = first[id];
    firstStartTime[i] = firstStartTime[id] || first[id];
    endingTime[i] = last[id];
    const tat = last[id] - arr[i];
    waitingTime[i] = tat - serv[i];
    turnAroundTime[i] = tat;
    server[i] = gantt.find(g => g.id === i)?.server || "Server 1";
  });

  return { startTime, endingTime, waitingTime, turnAroundTime, server, firstStartTime };
}

// Calculate server utilizations
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

// Compute summary statistics
function computeSummary(table, utilization, serverUtilizations = {}) {
  if (!table || table.length === 0) return null;
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  return {
    utilization,
    serverUtilizations,
    avgWait: avg(table.map((t) => t.waitTime || 0)),
    avgTAT: avg(table.map((t) => t.turnaroundTime || 0)),
    avgService: avg(table.map((t) => t.serviceTime || 0)),
    avgResponse: avg(table.map((t) => t.responseTime || 0))
  };
}

// Gantt helper function
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

// ===================== COMPONENT =====================

export default function GGC() {
  // State variables
  const [inputType, setInputType] = useState("customerCount");
  const [customerCount, setCustomerCount] = useState(10);
  const [timeRange, setTimeRange] = useState({
    startHours: 9,
    startMinutes: 0,
    endHours: 17,
    endMinutes: 0
  });
  
  const [arrivalDistribution, setArrivalDistribution] = useState("uniform");
  const [serviceDistribution, setServiceDistribution] = useState("uniform");
  
  const [arrivalParams, setArrivalParams] = useState({
    uniform: { a: 2, b: 8 },
    normal: { mean: 5, stdDev: 2 },
    exponential: { lambda: 0.2 }
  });
  
  const [serviceParams, setServiceParams] = useState({
    uniform: { a: 3, b: 10 },
    normal: { mean: 6, stdDev: 1.5 },
    exponential: { lambda: 0.15 }
  });
  
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
    setTab("form");
  }, []);

  const runSimulation = () => {
    try {
      const inputData = inputType === "customerCount" 
        ? { count: customerCount }
        : timeRange;

      // Generate arrival times and inter-arrival times
      const { arrivalTimes, interArrivalTimes } = generateArrivalTimes(inputType, inputData, arrivalDistribution, arrivalParams[arrivalDistribution]);
      
      // Generate service times
      const serviceTimes = generateServiceTimes(arrivalTimes.length, serviceDistribution, serviceParams[serviceDistribution]);
      
      // Generate priorities
      const priorities = prioOn 
        ? arrivalTimes.map(() => Math.round(pMin + Math.random() * (pMax - pMin)))
        : Array(arrivalTimes.length).fill(1);

      // Calculate schedule based on number of servers
      const gantt = numServers === 1 ? 
        calculateScheduleMG1(arrivalTimes, serviceTimes, priorities) :
        calculateScheduleMG2(arrivalTimes, serviceTimes, priorities);
      
      // Calculate performance measures
      const measures = performanceMeasures(arrivalTimes, serviceTimes, gantt);
      
      // Calculate utilizations
      const makespan = gantt.length > 0 ? gantt[gantt.length - 1]?.end || 1 : 1;
      const totalServiceTime = serviceTimes.reduce((a, b) => a + b, 0);
      const overallUtil = ((totalServiceTime / makespan) * 100).toFixed(1);
      const serverUtilizations = calculateServerUtilizations(gantt, numServers, makespan);

      // Create table with inter-arrival times
      const table = arrivalTimes.map((at, i) => {
        const interArrival = interArrivalTimes[i] || 0;
        return {
          serialNumber: i + 1,
          interArrival: +interArrival.toFixed(2),
          arrivalTime: +at.toFixed(2),
          serviceTime: +serviceTimes[i].toFixed(2),
          startTime: +(measures.startTime[i] || 0).toFixed(2),
          endTime: +(measures.endingTime[i] || 0).toFixed(2),
          turnaroundTime: +(measures.turnAroundTime[i] || 0).toFixed(2),
          waitTime: +(measures.waitingTime[i] || 0).toFixed(2),
          responseTime: +((measures.firstStartTime[i] || measures.startTime[i] || 0) - at).toFixed(2),
          server: measures.server[i] || "Server 1",
          priority: priorities[i]
        };
      });

      setResult({ table, ganttChart: gantt, utilization: overallUtil, serverUtilizations });
      setTab("table");
      
      const s = computeSummary(table, overallUtil, serverUtilizations);
      setSummary(s);
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Error in simulation: " + error.message);
    }
  };

  const getPriorityGradient = (prio) => {
    if (prio === 1) return "bg-gradient-to-br from-[#6D9197] to-[#2F575D]";
    if (prio === 2) return "bg-gradient-to-br from-[#2F575D] to-[#28363D]";
    return "bg-gradient-to-br from-[#28363D] to-[#6D9197]";
  };

  // Custom Time Picker Component
  const TimePicker = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#28363D]">{label}</label>
      <div className="flex gap-2">
        <select
          value={value.hours}
          onChange={(e) => onChange({ ...value, hours: +e.target.value })}
          className="flex-1 px-3 py-2 border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197]"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{i.toString().padStart(2, '0')}h</option>
          ))}
        </select>
        <span className="self-center text-gray-600">:</span>
        <select
          value={value.minutes}
          onChange={(e) => onChange({ ...value, minutes: +e.target.value })}
          className="flex-1 px-3 py-2 border-2 border-[#6D9197]/30 rounded-lg focus:border-[#6D9197]"
        >
          {[0, 15, 30, 45].map(min => (
            <option key={min} value={min}>{min.toString().padStart(2, '0')}m</option>
          ))}
        </select>
      </div>
    </div>
  );

  const DistributionParams = ({ distribution, params, onParamsChange, prefix }) => (
    <div className="grid grid-cols-2 gap-4">
      {distribution === "uniform" && (
        <>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Min (a) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.a}
              onChange={(e) => onParamsChange({ ...params, a: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197] transition-all"
              min="0.1"
            />
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Max (b) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.b}
              onChange={(e) => onParamsChange({ ...params, b: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197] transition-all"
              min={params.a || 0.1}
            />
          </div>
        </>
      )}
      {distribution === "normal" && (
        <>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Mean (μ) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.mean}
              onChange={(e) => onParamsChange({ ...params, mean: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197] transition-all"
              min="0.1"
            />
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Std Dev (σ) minutes</label>
            <input
              type="number"
              step="0.1"
              value={params.stdDev}
              onChange={(e) => onParamsChange({ ...params, stdDev: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197] transition-all"
              min="0.1"
            />
          </div>
        </>
      )}
      {distribution === "exponential" && (
        <>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Rate (λ) per minute</label>
            <input
              type="number"
              step="0.01"
              value={params.lambda}
              onChange={(e) => onParamsChange({ ...params, lambda: +e.target.value })}
              className="w-full px-4 py-3 text-center bg-gray-50 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197] transition-all"
              min="0.01"
            />
          </div>
          <div className="group">
            <label className="block text-sm font-bold text-[#28363D] mb-2">Mean (1/λ) minutes</label>
            <input
              type="number"
              step="0.1"
              value={1/params.lambda}
              disabled
              className="w-full px-4 py-3 text-center bg-gray-100 border-2 border-[#6D9197]/30 rounded-xl"
              readOnly
            />
          </div>
        </>
      )}
    </div>
  );

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
        {tab === "form" && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-6xl mx-auto border border-gray-100 my-8">
            <h2 className="text-4xl font-extrabold text-center mb-10 text-[#2F575D]">
              G/G/C Queue Simulation
            </h2>

            <div className="space-y-8">
              {/* Input Type Selection */}
              <div className="bg-gradient-to-r from-[#6D9197]/10 to-[#2F575D]/10 rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-[#28363D] mb-4">Simulation Input Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white rounded-xl border-2 border-[#6D9197]">
                      <input
                        type="radio"
                        value="customerCount"
                        checked={inputType === "customerCount"}
                        onChange={(e) => setInputType(e.target.value)}
                        className="w-5 h-5 text-[#6D9197]"
                      />
                      <div>
                        <div className="text-lg font-semibold">Customer Count</div>
                        <div className="text-sm text-gray-600">Fixed number of customers</div>
                      </div>
                    </label>
                    {inputType === "customerCount" && (
                      <div className="pl-8">
                        <label className="block text-sm font-semibold mb-2">Number of Customers</label>
                        <input
                          type="number"
                          value={customerCount}
                          onChange={(e) => setCustomerCount(Math.max(1, +e.target.value))}
                          className="w-full px-4 py-3 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197]"
                          min="1"
                          max="1000"
                        />
                        <p className="text-sm text-gray-600 mt-1">Exactly {customerCount} customers will be generated</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer p-4 bg-white rounded-xl border-2 border-[#2F575D]">
                      <input
                        type="radio"
                        value="timeRange"
                        checked={inputType === "timeRange"}
                        onChange={(e) => setInputType(e.target.value)}
                        className="w-5 h-5 text-[#2F575D]"
                      />
                      <div>
                        <div className="text-lg font-semibold">Time Range</div>
                        <div className="text-sm text-gray-600">Simulate within time window</div>
                      </div>
                    </label>
                    {inputType === "timeRange" && (
                      <div className="pl-8 space-y-4">
                        <TimePicker
                          value={{ hours: timeRange.startHours, minutes: timeRange.startMinutes }}
                          onChange={({ hours, minutes }) => setTimeRange(prev => ({ ...prev, startHours: hours, startMinutes: minutes }))}
                          label="Start Time"
                        />
                        <TimePicker
                          value={{ hours: timeRange.endHours, minutes: timeRange.endMinutes }}
                          onChange={({ hours, minutes }) => setTimeRange(prev => ({ ...prev, endHours: hours, endMinutes: minutes }))}
                          label="End Time"
                        />
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                          Total Duration: {((timeRange.endHours * 60 + timeRange.endMinutes) - (timeRange.startHours * 60 + timeRange.startMinutes))} minutes
                          <br />
                          <span className="text-xs">Customers will be generated until total arrival time exceeds this duration</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Distribution Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Arrival Distribution */}
                <div className="bg-white border-2 border-[#6D9197]/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-[#2F575D] mb-4">Arrival Distribution (Inter-arrival Times)</h3>
                  <select
                    value={arrivalDistribution}
                    onChange={(e) => setArrivalDistribution(e.target.value)}
                    className="w-full px-4 py-3 mb-4 border-2 border-[#6D9197]/30 rounded-xl focus:border-[#6D9197]"
                  >
                    <option value="uniform">Uniform Distribution</option>
                    <option value="normal">Normal Distribution</option>
                    <option value="exponential">Exponential Distribution</option>
                  </select>
                  <DistributionParams
                    distribution={arrivalDistribution}
                    params={arrivalParams[arrivalDistribution]}
                    onParamsChange={(newParams) => setArrivalParams({...arrivalParams, [arrivalDistribution]: newParams})}
                    prefix="arrival"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Time between customer arrivals (minutes)
                  </p>
                </div>

                {/* Service Distribution */}
                <div className="bg-white border-2 border-[#2F575D]/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-[#2F575D] mb-4">Service Distribution</h3>
                  <select
                    value={serviceDistribution}
                    onChange={(e) => setServiceDistribution(e.target.value)}
                    className="w-full px-4 py-3 mb-4 border-2 border-[#2F575D]/30 rounded-xl focus:border-[#2F575D]"
                  >
                    <option value="uniform">Uniform Distribution</option>
                    <option value="normal">Normal Distribution</option>
                  </select>
                  <DistributionParams
                    distribution={serviceDistribution}
                    params={serviceParams[serviceDistribution]}
                    onParamsChange={(newParams) => setServiceParams({...serviceParams, [serviceDistribution]: newParams})}
                    prefix="service"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Service times for each customer (minutes)
                  </p>
                </div>
              </div>

              {/* Server and Priority Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border-2 border-[#28363D]/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-[#2F575D] mb-4">Server Configuration</h3>
                  <select
                    value={numServers}
                    onChange={(e) => setNumServers(Math.max(1, +e.target.value))}
                    className="w-full px-4 py-3 border-2 border-[#28363D]/30 rounded-xl focus:border-[#28363D]"
                  >
                    <option value={1}>Single Server (G/G/1)</option>
                    <option value={2}>Two Servers (G/G/2)</option>
                    <option value={3}>Three Servers (G/G/3)</option>
                    <option value={4}>Four Servers (G/G/4)</option>
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    Number of servers available
                  </p>
                </div>

                <div className="bg-white border-2 border-[#6D9197]/20 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-[#2F575D] mb-4">Priority Settings</h3>
                  <label className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={prioOn}
                      onChange={(e) => setPrioOn(e.target.checked)}
                      className="w-5 h-5 text-[#6D9197]"
                    />
                    <span className="font-semibold">Enable Priority Queue</span>
                  </label>
                  
                  {prioOn && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Min Priority (Highest)</label>
                        <input
                          type="number"
                          value={pMin}
                          onChange={(e) => setPMin(Math.max(1, +e.target.value))}
                          className="w-full px-3 py-2 border border-[#6D9197]/30 rounded-lg"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Max Priority (Lowest)</label>
                        <input
                          type="number"
                          value={pMax}
                          onChange={(e) => setPMax(Math.max(pMin, +e.target.value))}
                          className="w-full px-3 py-2 border border-[#6D9197]/30 rounded-lg"
                          min={pMin}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    Lower number = Higher priority
                  </p>
                </div>
              </div>

              {/* Run Button */}
              <div className="text-center pt-6">
                <button
                  onClick={runSimulation}
                  className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white px-16 py-4 rounded-2xl font-bold text-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 shadow-lg"
                >
                  Run Simulation
                </button>
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
                                <div className="text-xl font-bold bg-black bg-opacity-40 px-4 py-1 rounded mt-2">{Math.round(seg.dur)}</div>
                              </>
                            )}
                            {seg.idle && (
                              <div className="text-sm font-bold bg-black bg-opacity-40 px-3 py-1 rounded mt-2">{Math.round(seg.dur)}</div>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="text-sm text-[#2F575D] font-semibold">{Math.round(seg.start)}</div>
                            <div className="w-1 h-8 bg-gray-300 mx-auto my-1"></div>
                            <div className="text-sm text-[#28363D] font-semibold">{Math.round(seg.end)}</div>
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
                     <td className="py-3 px-3">{Math.round(r.interArrival)}</td>
                      <td className="py-3 px-3">{Math.round(r.arrivalTime)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-3 py-1 rounded-full text-white font-bold ${
                          r.priority === 1 ? 'bg-[#6D9197]' : 
                          r.priority === 2 ? 'bg-[#2F575D]' : 
                          'bg-[#28363D]'
                        }`}>
                          {r.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">{ Math.round(r.serviceTime)}</td>
                      <td className="py-3 px-3 text-[#2F575D] font-bold">{Math.round(r.startTime)}</td>
                      <td className="py-3 px-3 text-[#28363D] font-bold">{Math.round(r.endTime)}</td>
                      <td className="py-3 px-3 text-[#6D9197] font-bold">{Math.round(r.turnaroundTime)}</td>
                      <td className="py-3 px-3 text-[#6D9197] font-bold">{Math.round(r.waitTime)}</td>
                      <td className="py-3 px-3 text-[#2F575D] font-bold">{Math.round(r.responseTime)}</td>
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
                  <p><strong>Note:</strong> Response Time = First Start - Arrival</p>
                </div>
              </div>

              <div className="col-span-9 bg-white p-10 min-h-[70vh]">
                <div className="w-full h-[65vh] bg-[#f3f7f8] rounded-2xl p-6 shadow-inner overflow-auto">
                  {(() => {
                    const labels = result.table.map((r) => `P${r.serialNumber}`);

                    let dataForMetric;
                   if (metric === "waiting") {
  dataForMetric = result.table.map((r) => Math.round(r.waitTime));
} else if (metric === "response") {
  dataForMetric = result.table.map((r) => Math.round(r.responseTime));
} else if (metric === "tat") {
  dataForMetric = result.table.map((r) => Math.round(r.turnaroundTime));
} else if (metric === "endTime") {
  dataForMetric = result.table.map((r) => Math.round(r.endTime));
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

    {/* Server Utilization Cards - G/G/C */}
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
              <div className="text-3xl font-bold">{result.table.length}</div>
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
                <div className="text-3xl font-bold">{result.table.length}</div>
                <p className="text-lg">Total Customers</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Overall Performance Metrics - G/G/C */}
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

    {/* Priority Distribution - G/G/C */}
    {prioOn && result && (
      <div className="mb-12">
        <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Priority Distribution</h3>
        
        {/* Calculate priority-wise statistics */}
        {(() => {
          const priorityStats = {};
          result.table.forEach(customer => {
            const priority = customer.priority;
            if (!priorityStats[priority]) {
              priorityStats[priority] = {
                count: 0,
                totalWaitTime: 0,
                totalServiceTime: 0,
                totalResponseTime: 0,
                totalTurnaroundTime: 0
              };
            }
            priorityStats[priority].count++;
            priorityStats[priority].totalWaitTime += customer.waitTime;
            priorityStats[priority].totalServiceTime += customer.serviceTime;
            priorityStats[priority].totalResponseTime += customer.responseTime;
            priorityStats[priority].totalTurnaroundTime += customer.turnaroundTime;
          });

          const priorityKeys = Object.keys(priorityStats).sort((a, b) => a - b);
          
          return (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {priorityKeys.map(priority => {
                  const stats = priorityStats[priority];
                  return (
                    <div key={priority} className="p-6 rounded-2xl bg-gradient-to-br from-[#28363D] to-[#6D9197] text-white shadow-lg">
                      <div className="flex flex-col items-center">
                        <h3 className="text-xl font-semibold mb-2">Priority {priority}</h3>
                        <div className="text-3xl font-black">{stats.count}</div>
                        <div className="text-lg mt-1">Customers</div>
                        <div className="text-xl font-bold mt-2 bg-white text-[#28363D] px-3 py-1 rounded-full">
                          {((stats.count / result.table.length) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Priority-wise Performance Table - G/G/C */}
              <div className="mt-8 overflow-x-auto bg-white rounded-xl shadow-lg">
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
                    {priorityKeys.map(priority => {
                      const stats = priorityStats[priority];
                      return (
                        <tr key={priority} className="border-b hover:bg-gray-50 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                priority === '1' ? 'bg-[#6D9197]' : 
                                priority === '2' ? 'bg-[#2F575D]' : 
                                'bg-[#28363D]'
                              }`}>
                                {priority}
                              </span>
                              <span className="text-lg font-semibold">
                                {priority === '1' ? 'High Priority' : 
                                 priority === '2' ? 'Medium Priority' : 
                                 'Low Priority'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold">{stats.count}</div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold text-[#6D9197]">
                              {(stats.totalWaitTime / stats.count).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold text-[#2F575D]">
                              {(stats.totalTurnaroundTime / stats.count).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold text-[#28363D]">
                              {(stats.totalServiceTime / stats.count).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold text-[#6D9197]">
                              {(stats.totalResponseTime / stats.count).toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="text-2xl font-bold">
                              {((stats.count / result.table.length) * 100).toFixed(1)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>
    )}

    {/* Performance Insights - G/G/C */}
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
              <span className="text-lg">Total Customers:</span>
              <span className="text-2xl font-bold text-[#28363D]">{result.table.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Total Simulation Time:</span>
              <span className="text-2xl font-bold text-[#2F575D]">
                {Math.round(result.table[result.table.length - 1]?.endTime || 1)} minutes
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gradient-to-br from-[#f3f7f8] to-white rounded-2xl border border-[#2F575D] shadow">
          <h4 className="text-xl font-bold text-[#2F575D] mb-4">Queue Analysis</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg">Avg Customer Throughput:</span>
              <span className="text-2xl font-bold text-[#28363D]">
                {((result.table.length / (result.table[result.table.length - 1]?.endTime || 1)).toFixed(3))} cust/min
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Avg Inter-arrival Time:</span>
              <span className="text-2xl font-bold text-[#6D9197]">
                {(() => {
                  const interArrivals = result.table.slice(1).map(t => t.interArrival);
                  const avg = interArrivals.reduce((a, b) => a + b, 0) / interArrivals.length;
                  return avg.toFixed(2);
                })()} minutes
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Traffic Intensity:</span>
              <span className="text-2xl font-bold text-[#2F575D]">
                {((1 / summary.avgService) / (1 / (result.table[result.table.length - 1]?.arrivalTime / result.table.length))).toFixed(3)}
              </span>
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