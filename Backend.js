let cummulativeProbabilities = [];
let cpLookUp = [];
let interArrival = [];
let minNoOfArrival = [];
let arrivalTime = [];
let serviceTime = [];
let startTime = [];
let endingTime = [];
let turnAroundTime = [];
let waitingTime = [];
let responseTime = [];
let priority = [];
let table = [];



function factorial(n) {
  if (n === 0) return 1;
  if (n > 0) return n * factorial(n - 1);
}

// ---------------------------------------------------------
// PRIORITY FORMULA: a + (b-a) * Rnd#
// ---------------------------------------------------------
const genPriority = (a, b, xI) => {
  return Math.round((b - a) * xI + a);
};

function PriorityGeneration(A, M, C, Z, len, a, b) {
  let minusZi = [];
  let zI = [];
  minusZi[0] = Z;
  
  for (let i = 0; i < len; i++) {
    let mod = (A * minusZi[i] + C) % M;
    zI.push(mod);
    minusZi.push(zI[i]);
    
    let random = Number((zI[i] / M).toFixed(4)); 
    let p = genPriority(a, b, random);
    priority.push(p);
  }
}

// ---------------------------------------------------------
// MAIN SIMULATION FUNCTION
// ---------------------------------------------------------
function generateCummulativeProbability(meanArrivalNumber, meanServiceNumber, priorityParams = null) {
  // CONFIGURATION: LIMIT TO 6 CUSTOMERS
  const CUSTOMER_LIMIT = 6;

  // Reset
  cummulativeProbabilities = [];
  cpLookUp = [];
  interArrival = [];
  minNoOfArrival = [];
  arrivalTime = [];
  serviceTime = [];
  startTime = [];
  endingTime = [];
  turnAroundTime = [];
  waitingTime = [];
  responseTime = [];
  table = [];
  priority = [];

  meanArrivalNumber = Number(meanArrivalNumber);
  meanServiceNumber = Number(meanServiceNumber);

  // 1. CP (Poisson Distribution Table)
  // This builds the probability distribution, NOT the customers.
  let cummulativeProbability = 0;
  let x = 0;
  while (cummulativeProbability.toFixed(4) < 1) {
    const newValue = (Math.exp(-meanArrivalNumber) * Math.pow(meanArrivalNumber, x)) / factorial(x);
    cummulativeProbability += newValue;
    cummulativeProbabilities.push(Number(cummulativeProbability.toFixed(4)));
    x += 1;
  }

  // 2. Generate Service Times (For 6 Customers)
  for (let i = 0; i < CUSTOMER_LIMIT; i++) {
    let result = Math.round(-meanServiceNumber * Math.log(Math.random()));
    while (result < 1) {
      result = Math.round(-meanServiceNumber * Math.log(Math.random()));
    }
    serviceTime.push(result);
  }

  // 3. Lookups
  CP_LookUp(cummulativeProbabilities);
  genMinNoOfArrival();

  // 4. Priority (For 6 Customers)
  let isPriority = false;
  if (priorityParams && priorityParams.a !== undefined && priorityParams.b !== undefined) {
    isPriority = true;
    PriorityGeneration(55, 1994, 9, 10112166, CUSTOMER_LIMIT, Number(priorityParams.a), Number(priorityParams.b));
  } else {
    for(let i=0; i<CUSTOMER_LIMIT; i++) priority.push(1);
  }

  // 5. Arrivals (For 6 Customers)
  interArrival[0] = 0;
  // Loop up to CUSTOMER_LIMIT
  for (let i = 1; i < CUSTOMER_LIMIT; i++) {
    const result = generateInterArrival(cpLookUp, cummulativeProbabilities, minNoOfArrival);
    interArrival.push(result);
  }
  for (let i = 0; i < interArrival.length; i++) {
    arrivalTime.push(i === 0 ? 0 : arrivalTime[i - 1] + interArrival[i]);
  }

  // 6. Schedule (Precision Fixed)
  const ganttChart = calculateSchedule(arrivalTime, serviceTime, priority);

  // 7. Metrics
  performanceMeasures(arrivalTime, serviceTime, ganttChart, isPriority);

  // 8. Server Utilization (Accurate)
  const totalServiceTime = serviceTime.reduce((a, b) => a + b, 0);
  const maxEndTime = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1].end_Time : 1;
  const serverUtilization = (totalServiceTime / maxEndTime) * 100;

  // 9. Table Data
  for (let i = 0; i < arrivalTime.length; i++) {
    table.push({
      arrivalTime: arrivalTime[i],
      startTime: startTime[i],
      endingTime: endingTime[i],
      serviceTime: serviceTime[i],
      turnAroundTime: turnAroundTime[i],
      waitingTime: waitingTime[i],
      responseTime: responseTime[i],
      priority: priority[i],
    });
  }

  return {
    table,
    serverUtilization,
    ganttCharts: [ganttChart]
  };
}

// ---------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------
function CP_LookUp(cummulativeProbabilities) {
  cpLookUp[0] = 0;
  for (let i = 0; i < cummulativeProbabilities.length - 1; i++) {
    cpLookUp.push(cummulativeProbabilities[i]);
  }
}

function genMinNoOfArrival() {
  for (let i = 0; i < cummulativeProbabilities.length; i++) {
    minNoOfArrival.push(i);
  }
}

function generateInterArrival(cpTable, cummulativeProbabilities, minNoOfArrival) {
  while (true) {
    let genIA = Number(Math.random().toFixed(4));
    for (let i = 1; i < cpTable.length; i++) {
      if (cpTable[i] <= genIA && genIA < cummulativeProbabilities[i]) {
        return minNoOfArrival[i];
      }
    }
  }
}

function calculateSchedule(arrivalTimes, serviceTimes, priorities) {
  const ganttChart = []; 
  const queue = []; 
  
  let currentTime = 0;

  const customers = arrivalTimes.map((arrival, index) => ({
    id: index,
    arrivalTime: Number(arrival.toFixed(4)),
    remainingServiceTime: serviceTimes[index], 
    totalServiceTime: serviceTimes[index],
    priority: priorities[index],
  }));

  customers.sort((a, b) => a.arrivalTime - b.arrivalTime);

  const addToQueue = (time) => {
    customers.forEach((customer) => {
      if (
        customer.arrivalTime <= (time + 0.0001) &&
        customer.remainingServiceTime > 0 &&
        !queue.some((q) => q.id === customer.id)
      ) {
        queue.push(customer);
      }
    });
    
    queue.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.arrivalTime - b.arrivalTime;
      }
      return a.priority - b.priority;
    });
  };

  while (queue.length > 0 || customers.some((c) => c.remainingServiceTime > 0)) {
    addToQueue(currentTime);

    if (queue.length === 0) {
      const pending = customers.filter((c) => c.remainingServiceTime > 0);
      if (pending.length === 0) break; 
      
      const nextArrival = Math.min(...pending.map((c) => c.arrivalTime));
      currentTime = nextArrival;
      addToQueue(currentTime);
    }

    const currentCustomer = queue.shift();

    const futureArrivals = customers.filter(
        (c) => c.arrivalTime > (currentTime + 0.0001) && c.remainingServiceTime > 0
    );

    let nextInterruptTime = Infinity;
    if (futureArrivals.length > 0) {
        nextInterruptTime = Math.min(...futureArrivals.map(c => c.arrivalTime));
    }

    const timeToNextEvent = nextInterruptTime - currentTime;
    const serviceDuration = Math.min(currentCustomer.remainingServiceTime, timeToNextEvent);

    const safeDuration = Number(serviceDuration.toFixed(4));
    const start = Number(currentTime.toFixed(4));
    const end = Number((currentTime + safeDuration).toFixed(4));

    ganttChart.push({
      customer_Id: currentCustomer.id,
      priority: currentCustomer.priority,
      start_Time: start,
      end_Time: end,
    });

    currentCustomer.remainingServiceTime = Number((currentCustomer.remainingServiceTime - safeDuration).toFixed(4));
    currentTime = end;

    addToQueue(currentTime);

    if (currentCustomer.remainingServiceTime > 0.0001) {
      queue.push(currentCustomer);
      queue.sort((a, b) => {
        if (a.priority === b.priority) return a.arrivalTime - b.arrivalTime;
        return a.priority - b.priority;
      });
    }
  }

  const mergedGanttChart = [];
  for (let i = 0; i < ganttChart.length; i++) {
    const current = ganttChart[i];
    if (
      mergedGanttChart.length > 0 &&
      mergedGanttChart[mergedGanttChart.length - 1].customer_Id === current.customer_Id
    ) {
      mergedGanttChart[mergedGanttChart.length - 1].end_Time = current.end_Time;
    } else {
      mergedGanttChart.push({ ...current });
    }
  }

  return mergedGanttChart;
}

function performanceMeasures(arrivalTime, serviceTime, ganttChart, isPriority) {
  startTime = Array(arrivalTime.length).fill(null);
  endingTime = Array(arrivalTime.length).fill(null);
  turnAroundTime = [];
  waitingTime = [];
  responseTime = [];

  let processedStart = new Set();
  let processedEnd = new Set();

  ganttChart.forEach((entry) => {
    if (!processedStart.has(entry.customer_Id)) {
      startTime[entry.customer_Id] = Number(entry.start_Time.toFixed(4));
      processedStart.add(entry.customer_Id);
    }
  });

  for (let i = ganttChart.length - 1; i >= 0; i--) {
    let entry = ganttChart[i];
    if (!processedEnd.has(entry.customer_Id)) {
      endingTime[entry.customer_Id] = Number(entry.end_Time.toFixed(4));
      processedEnd.add(entry.customer_Id);
    }
  }

  for (let i = 0; i < arrivalTime.length; i++) {
      if (startTime[i] === null) {
          turnAroundTime.push(0);
          waitingTime.push(0);
          responseTime.push(0);
          continue;
      }

      const tat = endingTime[i] - arrivalTime[i];
      const wt = tat - serviceTime[i];
      const rt = startTime[i] - arrivalTime[i];

      turnAroundTime.push(Number(tat.toFixed(4)));
      waitingTime.push(Number(Math.max(0, wt).toFixed(4)));
      responseTime.push(Number(Math.max(0, rt).toFixed(4)));
  }
}

export default generateCummulativeProbability;