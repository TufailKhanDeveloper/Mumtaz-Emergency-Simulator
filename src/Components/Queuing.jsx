import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const Queuing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loadingCard, setLoadingCard] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  
  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  const handleCardClick = (cardId, path) => {
    // Set loading state
    setLoadingCard(cardId);
    setActiveCard(cardId);
    
    // Simulate loading for 1 second
    setTimeout(() => {
      // Navigate to the route (same page)
      navigate(path);
      setLoadingCard(null);
    }, 1000);
  };

  const handleBackToCards = () => {
    setActiveCard(null);
    navigate('/queuing');
  };

  const cardConfigs = [
    {
      id: 'MMC',
      title: 'M/M/C',
      desc: 'Multiple servers with Poisson arrivals and exponential service times',
      gradient: 'from-[#6D9197] to-[#2F575D]',
      color: 'yellow',
      tags: ['Markovian', 'Parallel Servers'],
      path: '/queuing/MMC'
    },
    {
      id: 'MGC',
      title: 'M/G/C',
      desc: 'Multiple servers with Poisson arrivals and general service times',
      gradient: 'from-[#2F575D] to-[#28363D]',
      color: 'purple',
      tags: ['Semi-Markovian', 'General Service'],
      path: '/queuing/MGC'
    },
    {
      id: 'GGC',
      title: 'G/G/C',
      desc: 'Multiple servers with general arrivals and general service times',
      gradient: 'from-[#28363D] to-[#6D9197]',
      color: 'red',
      tags: ['General', 'Complex System'],
      path: '/queuing/GGC'
    }
  ];

  const getColorClass = (color) => {
    switch(color) {
      case 'yellow': return 'bg-yellow-200';
      case 'purple': return 'bg-purple-300';
      case 'red': return 'bg-red-300';
      default: return 'bg-yellow-200';
    }
  };

  const getActiveCard = () => {
    return cardConfigs.find(card => card.id === activeCard) || cardConfigs.find(card => isActive(card.id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7f8] to-[#e8f0f2] p-6">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-center text-[#2F575D] mb-2">
          {activeCard ? `${getActiveCard()?.title} Simulation` : 'Queuing Theory Models'}
        </h1>
        <p className="text-center text-[#6D9197] text-lg mb-8">
          {activeCard ? getActiveCard()?.desc : 'Advanced queueing models with comprehensive analysis'}
        </p>
      </div>

      {/* Show Back Button when a card is active */}
      {(activeCard || location.pathname !== '/queuing') && (
        <div className="max-w-7xl mx-auto mb-6">
          <button
            onClick={handleBackToCards}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-105 text-[#2F575D] font-medium"
          >
            <span className="text-xl">←</span>
            Back to All Models
          </button>
        </div>
      )}

      {/* Navigation Cards Section - Only show when no active card */}
      {!activeCard && location.pathname === '/queuing' ? (
        <div className="max-w-5xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cardConfigs.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id, card.path)}
                className={`group relative overflow-hidden rounded-2xl shadow-xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl cursor-pointer ${
                  isActive(card.id) 
                    ? "ring-4 ring-[#2F575D] ring-opacity-60" 
                    : ""
                }`}
              >
                {/* Loading Overlay */}
                {loadingCard === card.id && (
                  <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block relative">
                        {/* Spinner */}
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {/* Icon in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl">{card.icon}</span>
                        </div>
                      </div>
                      <p className="text-white mt-4 font-medium">Loading {card.title}...</p>
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className={`bg-gradient-to-br ${card.gradient} p-8 text-white h-48 flex flex-col justify-between relative`}>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-2xl font-bold">{card.title}</h3>
                      <span className="text-xl ml-auto">{card.icon}</span>
                    </div>
                    <p className="text-sm opacity-90">{card.desc}</p>
                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      {card.tags.map((tag, index) => (
                        <span key={index} className="text-xs px-3 py-1 bg-white/20 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-200 font-semibold group-hover:translate-x-2 transition-transform flex items-center gap-2">
                      {loadingCard === card.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-yellow-200 border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        'Click to Simulate →'
                      )}
                    </span>
                    {isActive(card.id) && !loadingCard && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                        <span className="text-xs">Active</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Loading Progress Bar (Bottom) */}
                  {loadingCard === card.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-200 animate-[progress_1s_linear]"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Loading Status Indicator */}
          {loadingCard && (
            <div className="max-w-md mx-auto mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#2F575D">Preparing Simulation...</h4>
                  <p className="text-xs text-[#6D9197]">
                    Initializing {getActiveCard()?.title} model parameters
                  </p>
                </div>
              </div>
            </div>
          )}

     
        </div>
      ) : (
        loadingCard && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4">
              <div className="flex flex-col items-center">
                {/* Animated Queue Visualization */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-32 h-20">
                    {/* Server Box */}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-12 border-2 border-[#2F575D] rounded-lg flex items-center justify-center">
                      <span className="text-[#2F575D] font-bold">Server</span>
                    </div>
                    
                    {/* Arriving Customers */}
                    {[1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className="absolute w-6 h-6 bg-[#6D9197] rounded-full flex items-center justify-center text-white text-xs font-bold animate-[moveRight_1s_ease-in-out_infinite]"
                        style={{
                          left: `${i * 20}px`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          animationDelay: `${i * 0.2}s`
                        }}
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-[#2F575D] mb-2">
                  Loading {getActiveCard()?.title} Simulation
                </h3>
                <p className="text-[#6D9197] text-center mb-6">
                  Please wait while we prepare the queuing model simulation...
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] h-full rounded-full animate-[progress_1s_linear]"
                  ></div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-[#6D9197]">
                  <div className="w-4 h-4 border-2 border-[#6D9197] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading model parameters...</span>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Content Section - Shows the simulation component */}
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes moveRight {
          0% { transform: translateY(-50%) translateX(0); opacity: 1; }
          100% { transform: translateY(-50%) translateX(100px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default Queuing