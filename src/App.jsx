import React from "react";
import Navbar from './Components/Navbar';
import HeroSection from "./Components/HeroSection";
import FeatureSection from "./Components/FeatureSection";
import Simulation from './Components/Simulation';
import { Routes, Route, Navigate } from "react-router-dom";
import MM1 from "./Components/MM1";
import MMC from "./Components/MMC";
import MGC from "./Components/MGC";
import Queuing from "./Components/Queuing";
import GGC from "./Components/GGC";
import MMCSimulation from "./Components/MMCSimulation";
import MGCSimulation from "./Components/MGCSimulation";
import GraphAnalytics from './Components/GraphAnalytics';

function App() {
  return (
    <div className="bg-gray-100 text-gray-900">
      {/* Navbar */}
      <Navbar />

      {/* Routes */}
      <Routes>
        {/* Home Route */}
        <Route path="/" element={
          <>
            <HeroSection />
            <FeatureSection />
          </>
        } />

        {/* Simulation Main Page */}
        <Route path="/simulation" element={<Simulation />} />

        {/* Separate Simulation Pages */}
        <Route path="/simulation/MM1" element={<MM1 />} />
        <Route path="/simulation/MMCSimulation" element={<MMCSimulation />} />
        <Route path="/simulation/MGCSimulation" element={<MGCSimulation />} />
        <Route path="/simulation/GGCSimulation" element={<GraphAnalytics />} />

        {/* Queuing Models Route */}
        <Route path="/Queuing" element={<Queuing />}>
          <Route path="MMC" element={<MMC />} />
          <Route path="MGC" element={<MGC />} />
          <Route path="GGC" element={<GGC />} />
        </Route>

        {/* Redirect to Home if Route Not Found */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;