import React from 'react';
import { Link } from 'react-router-dom';
import heroImage from "../assets/pic1.jpg";
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const HeroSection = () => {
  const [ref, isVisible] = useScrollAnimation(0.1);

  return (
    <section ref={ref} className="relative overflow-hidden bg-gradient-to-br from-[#f3f7f8] via-white to-[#e8f0f2] min-h-screen">
      {/* Full Width Image Background */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={heroImage}
          alt="Emergency Department Queue Analysis"
          className="w-full h-full object-cover"
        />
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Animated Medical Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className={`absolute top-20 left-10 w-16 h-16 border-4 border-[#6D9197] rounded-full transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
        <div className={`absolute bottom-32 right-20 w-12 h-12 border-4 border-[#2F575D] rotate-45 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 relative z-10 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          
          {/* Text Content - Left Side */}
          <div className={`text-white transition-all duration-1000 ease-out ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'
          }`}>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="text-white">Mumtaz Emergency Center</span>
              <br />
              <span className="text-yellow-300">Queue Simulator</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 leading-relaxed max-w-2xl text-gray-200">
              Advanced queueing theory applied to emergency healthcare. 
              Optimize patient flow, reduce waiting times, and improve 
              resource allocation in trauma centers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link 
                to="/simulation" 
                className="group relative bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:from-[#2F575D] hover:to-[#28363D]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Start Simulation</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              
              <Link 
                to="/queuing" 
                className="group border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white hover:text-[#2F575D] transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>View Models</span>
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className={`grid grid-cols-4 gap-6 max-w-2xl transition-all duration-1000 delay-500 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              <div className="text-center group">
                <div className="text-2xl md:text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors">M/M/1</div>
                <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Single Server</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl md:text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors">M/M/C</div>
                <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Multi-Server</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl md:text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors">M/G/C</div>
                <div className="text-sm text-gray-300 group-hover:text-white transition-colors">General Service</div>
              </div>

              <div className="text-center group">
  <div className="text-2xl md:text-3xl font-bold text-white group-hover:text-yellow-300 transition-colors">
    G/G/1
  </div>
  <div className="text-sm text-gray-300 group-hover:text-white transition-colors">
    General Service 
  </div>
</div>
            </div>
          </div>

          {/* Right Side - Analytics Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-1000 delay-300 ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'
          }`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-yellow-300 text-lg font-bold mb-2">Real-time Analytics</div>
              <div className="text-white text-sm">Live patient flow monitoring and queue optimization</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-yellow-300 text-lg font-bold mb-2">Priority Queuing</div>
              <div className="text-white text-sm">Triage-based emergency patient management</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-yellow-300 text-lg font-bold mb-2">Resource Allocation</div>
              <div className="text-white text-sm">Optimal staff and equipment utilization</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-yellow-300 text-lg font-bold mb-2">Performance Metrics</div>
              <div className="text-white text-sm">Comprehensive ED efficiency analysis</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;