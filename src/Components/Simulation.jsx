import React from "react";
import { Outlet, useLocation } from "react-router-dom";

const Simulation = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7f8] to-[#e8f0f2] p-6">
      {/* Navigation Cards Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-center text-[#2F575D] mb-2">
          Queueing Models Simulator
        </h1>
        <p className="text-center text-[#6D9197] text-lg mb-8">
          Select a queueing model to simulate and analyze
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* M/M/1 Card */}
          <a 
            href="/simulation/MM1"  // Direct link to MM1 page
            className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
              isActive("MM1") 
                ? "ring-4 ring-[#6D9197] ring-opacity-60" 
                : ""
            }`}
          >
            <div className="bg-gradient-to-br from-[#6D9197] to-[#2F575D] p-8 text-white h-48 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">M/M/1</h3>
                <p className="text-sm opacity-90">
                  Single server with Poisson arrivals and exponential service times
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-200 font-semibold">Explore →</span>
                {isActive("MM1") && (
                  <div className="w-3 h-3 bg-yellow-200 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </a>

          {/* M/M/C Card */}
          <a 
            href="/simulation/MMCSimulation"  // Direct link to MMC page
            className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
              isActive("MMCSimulation") 
                ? "ring-4 ring-[#6D9197] ring-opacity-60" 
                : ""
            }`}
          >
            <div className="bg-gradient-to-br from-[#2F575D] to-[#28363D] p-8 text-white h-48 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">M/M/C</h3>
                <p className="text-sm opacity-90">
                  Multiple servers with Poisson arrivals and exponential service times
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-200 font-semibold">Explore →</span>
                {isActive("MMCSimulation") && (
                  <div className="w-3 h-3 bg-yellow-200 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </a>

          {/* M/G/C Card */}
          <a 
            href="/simulation/MGCSimulation"  // Direct link to MGC page
            className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
              isActive("MGCSimulation") 
                ? "ring-4 ring-[#6D9197] ring-opacity-60" 
                : ""
            }`}
          >
            <div className="bg-gradient-to-br from-[#28363D] to-[#6D9197] p-8 text-white h-48 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">M/G/C</h3>
                <p className="text-sm opacity-90">
                  Multiple servers with Poisson arrivals and general service times
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-200 font-semibold">Explore →</span>
                {isActive("MGCSimulation") && (
                  <div className="w-3 h-3 bg-yellow-200 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </a>


{/* G/G/C Card */}
          <a 
            href="/simulation/GGCSimulation"  // Direct link to MGC page
            className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${
              isActive("MGCSimulation") 
                ? "ring-4 ring-[#6D9197] ring-opacity-60" 
                : ""
            }`}
          >
            <div className="bg-gradient-to-br from-[#28363D] to-[#6D9197] p-8 text-white h-48 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">G/G/C</h3>
                <p className="text-sm opacity-90">
                  Multiple servers with Poisson arrivals and general service times
                </p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-yellow-200 font-semibold">Explore →</span>
                {isActive("MGCSimulation") && (
                  <div className="w-3 h-3 bg-yellow-200 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
          </a>

          
        </div>
      </div>

      {/* Outlet Section - Ab yahan kuch nahi dikhega kyunki separate pages par redirect hoga */}
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default Simulation;