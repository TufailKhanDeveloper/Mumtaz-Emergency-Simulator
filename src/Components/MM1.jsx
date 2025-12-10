import React, { useState } from "react";
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

// ===================== VARIABLES =====================

let arrivalTime = [],
  serviceTime = [],
  startTime = [],
  endingTime = [],
  waitingTime = [],
  turnAroundTime = [],
  priority = [],
  table = [],
  cpValues = [],
  cpLookup = [],
  interArrival = [],
  avgTimeBetweenArrival = [];

// ===================== HELPER FUNCTIONS =====================

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function generateCummulativeProbability(lambda, mu, priorityParams = null) {
  // Reset all arrays
  [
    arrivalTime,
    serviceTime,
    startTime,
    endingTime,
    waitingTime,
    turnAroundTime,
    table,
    priority,
    cpValues,
    cpLookup,
    interArrival,
    avgTimeBetweenArrival
  ] = Array(12)
    .fill()
    .map(() => []);

  // Generate CP values until cumulative probability reaches approximately 1.0
  let cp = 0,
    cplookup = 0,
    count = 0;
  let cparray = [];
  let cplookuparray = [];
  
  while (cp <= 0.999999999999999) {
    // Calculate individual probability using Poisson formula
    let calc = Math.exp(-lambda) * Math.pow(lambda, count) / factorial(count);
    
    // Store the previous cumulative probability
    cplookup = cp;
    cplookuparray[count] = cplookup;
    
    // Update the cumulative probability
    cp = calc + cplookup;
    cparray[count] = cp;
    
    count++;
  }
  
  // Copy the arrays to the global arrays
  cpValues = [...cparray];
  cpLookup = [...cplookuparray];

  // Generate service times for each customer
  for (let i = 0; i < cpLookup.length; i++) {
    let st = Math.round(-mu * Math.log(Math.random()));
    serviceTime.push(st < 1 ? 1 : st);
  }

  // Generate priority values if priority is enabled
  if (priorityParams) {
    let Z = 10112166,
      A = 55,
      M = 1994,
      C = 9,
      zi = Z;
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
    let r = Math.random(),
      found = false;
    for (let j = 1; j < cpLookup.length; j++) {
      if (cpLookup[j - 1] <= r && r < cpLookup[j]) {
        inter.push(j);
        found = true;
        break;
      }
    }
    if (!found) inter.push(0);
  }

  // Calculate arrival times
  arrivalTime = inter.reduce(
    (a, c, i) => [...a, i === 0 ? 0 : a[i - 1] + c],
    []
  );

  // Calculate average time between arrivals
  for (let i = 0; i < arrivalTime.length; i++) {
      avgTimeBetweenArrival.push(i);
      }

  // Store inter-arrival times
  interArrival = [...inter];

  // Calculate schedule and performance measures
  const gantt = calculateSchedule(arrivalTime, serviceTime, priority);
  performanceMeasures(arrivalTime, serviceTime, gantt);

  // Calculate server utilization
  const total = serviceTime.reduce((a, b) => a + b, 0);
  const makespan = gantt[gantt.length - 1]?.end || 1;
  const util = ((total / makespan) * 100).toFixed(1);

  // Create table with all required columns
  table = arrivalTime.map((at, i) => ({
    serialNumber: i + 1,
    cpLookup: cpLookup[i],
    cp: cpValues[i],
    avgTimeBetweenArrival: avgTimeBetweenArrival[i],
    interArrival: interArrival[i],
    arrivalTime: at,
    serviceTime: serviceTime[i],
    startTime: startTime[i] || 0,
    endTime: endingTime[i] || 0,
    turnaroundTime: turnAroundTime[i] || 0,
    waitTime: waitingTime[i] || 0,
    responseTime: (startTime[i] || 0) - at,
    server: "Server 1",
    priority: priority[i]
  }));

  return { table, ganttChart: gantt, utilization: util };
}

function calculateSchedule(arr, serv, prio) {
  const gantt = [];
  let t = 0;
  const q = [];
  const cust = arr.map((a, i) => ({
    id: i,
    arr: a,
    rem: serv[i],
    prio: prio[i]
  }));

  while (q.length || cust.some((c) => c.rem > 0)) {
    cust
      .filter((c) => c.arr <= t && c.rem > 0 && !q.some((x) => x.id === c.id))
      .forEach((c) => q.push(c));

    q.sort((a, b) => a.prio - b.prio || a.arr - b.arr);

    if (!q.length) {
      // Add idle block from current time to next arrival
      const nextArrival = Math.min(...cust.filter((c) => c.rem > 0).map((c) => c.arr));
      gantt.push({
        id: -1, // Use -1 to indicate idle time
        prio: 0,
        start: +t.toFixed(2),
        end: +nextArrival.toFixed(2),
        dur: +(nextArrival - t).toFixed(2),
        preempted: false,
        idle: true // Add a flag to indicate this is an idle block
      });
      t = nextArrival;
      continue;
    }

    const c = q.shift();
    const next = Math.min(
      ...cust.filter((x) => x.arr > t && x.rem > 0).map((x) => x.arr),
      Infinity
    );
    const serve = Math.min(
      c.rem,
      next === Infinity ? c.rem : next - t
    );

    gantt.push({
      id: c.id,
      prio: c.prio,
      start: +t.toFixed(2),
      end: +(t + serve).toFixed(2),
      dur: +serve.toFixed(2),
      preempted: serve < c.rem,
      idle: false // This is not an idle block
    });

    c.rem -= serve;
    t += serve;

    if (c.rem > 0) q.push(c);
  }
  return gantt;
}

function performanceMeasures(arr, serv, gantt) {
  const first = {},
    last = {};
  gantt.forEach((s) => {
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
  });
}

function computeSummary(table, utilization) {
  if (!table || table.length === 0) return null;
  
  // Helper function for average calculation
  const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  
  // Calculate overall averages
  const overall = {
    utilization,
    avgWait: avg(table.map((t) => t.waitTime)),
    avgTAT: avg(table.map((t) => t.turnaroundTime)),
    avgService: avg(table.map((t) => t.serviceTime)),
    avgResponse: avg(table.map((t) => t.responseTime))
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
          avgWait: avg(priorityTable.map(t => t.waitTime)),
          avgTAT: avg(priorityTable.map(t => t.turnaroundTime)),
          avgService: avg(priorityTable.map(t => t.serviceTime)),
          avgResponse: avg(priorityTable.map(t => t.responseTime)),
          percentage: ((priorityTable.length / table.length) * 100).toFixed(1)
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
  
  return {
    ...overall,
    priorityWise,
    priorityDistribution,
    totalCustomers: table.length,
    uniquePriorities: uniquePriorities.length
  };
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

  const runSim = () => {
    const data = generateCummulativeProbability(
      lambda,
      mu,
      prioOn ? { a: pMin, b: pMax } : null
    );
    setResult(data);
    setTab("table");
    const s = computeSummary(data.table, data.utilization);
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

      <main className="w-full mx-auto p-6">

{tab === "form" && (
  <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-7xl mx-auto border border-gray-100">
    
    {/* Main Title */}
    <h2 className="text-4xl font-extrabold text-center mb-10 text-[#2F575D] tracking-tight">
      M/M/1  Priority Queue — Simulation Setup
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
            onClick={runSim}
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

            <div className="flex gap-6 items-end justify-start min-w-max py-6">
              {result.ganttChart.map((seg, i) => {
                // width scale relative to makespan (visual)
                const makespan = result.ganttChart[result.ganttChart.length - 1]?.end || 1;
                const widthPercent = Math.max((seg.dur / makespan) * 100, 6); // ensure visible
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
                      <td className="py-3 px-3">{r.cpLookup.toFixed(15)}</td>
                      <td className="py-3 px-3">{r.cp.toFixed(15)}</td>
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
                      <td className="py-3 px-3">{r.server}</td>
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

 {tab === "calc" && summary && (
  <div className="p-8 rounded-2xl shadow-2xl max-w-6xl mx-auto my-10">
    <h2 className="text-3xl font-bold text-center mb-8 text-[#2F575D]">Performance Calculations</h2>

    {/* Server Utilization Card - Single Server for M/M/1 */}
    <div className="mb-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Server Utilization</h3>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-[#6D9197] to-[#2F575D] text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Server 1 Utilization</h3>
              <div className="text-5xl font-black mt-4">{summary.utilization}%</div>
              <p className="mt-2 text-lg opacity-90">Percentage of time server is busy</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{summary.totalCustomers}</div>
              <p className="text-lg">Total Customers</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Overall Performance Metrics - M/M/1 */}
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

    {/* Priority Distribution - M/M/1 */}
    {summary.priorityDistribution && (
      <div className="mb-12">
        <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Priority Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Object.entries(summary.priorityDistribution).map(([priorityKey, data]) => (
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

    {/* Priority-wise Performance Table - M/M/1 */}
    {summary.priorityWise && (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-[#2F575D]">Priority-wise Performance</h3>
          <div className="text-lg font-semibold text-[#2F575D]">
            Total: {summary.totalCustomers} Customers | {summary.uniquePriorities} Priority Levels
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

    {/* Performance Insights - M/M/1 */}
    <div className="mt-12">
      <h3 className="text-2xl font-bold mb-6 text-[#2F575D]">Performance Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-[#f3f7f8] to-white rounded-2xl border border-[#6D9197] shadow">
          <h4 className="text-xl font-bold text-[#2F575D] mb-4">System Efficiency</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg">Server Utilization:</span>
              <span className="text-2xl font-bold text-[#6D9197]">{summary.utilization}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg">Avg Customer Throughput:</span>
              <span className="text-2xl font-bold text-[#2F575D]">
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