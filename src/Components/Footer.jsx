import React from "react";
import github from "../assets/github.png";
import email from "../assets/email.png";

const Footer = () => {
  return (
    <footer id="contact" className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white py-8 h-64"> {/* Fixed height */}
      
      <div className="container mx-auto px-4 h-full">
        
        {/* Main Row with 4 Equal Columns */}
        <div className="grid grid-cols-4 gap-6 h-4/5">
          
          {/* Column 1: Simulator Info */}
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2 text-yellow-200"> Mumtaz Emergency Simulator</h3>
            <p className="text-gray-200 text-xs leading-relaxed">
              Emergency department queueing analysis for optimal patient flow and resource management.
            </p>
          </div>

          {/* Column 2: Queueing Models */}
          <div className="text-center">
            <h4 className="text-md font-semibold mb-2 text-yellow-200"> Models</h4>
            <ul className="space-y-1 text-xs">
              <li><a href="#mm1" className="text-gray-200 hover:text-yellow-200">M/M/1</a></li>
              <li><a href="#mmc" className="text-gray-200 hover:text-yellow-200">M/M/C</a></li>
              <li><a href="#mgc" className="text-gray-200 hover:text-yellow-200">M/G/C</a></li>
              <li><a href="#priority" className="text-gray-200 hover:text-yellow-200">Priority</a></li>
            </ul>
          </div>

          {/* Column 3: Applications */}
          <div className="text-center">
            <h4 className="text-md font-semibold mb-2 text-yellow-200"> Uses</h4>
            <ul className="space-y-1 text-xs">
              <li className="text-gray-200">ER Optimization</li>
              <li className="text-gray-200">Staff Planning</li>
              <li className="text-gray-200">Resource Allocation</li>
              <li className="text-gray-200">Wait Time Analysis</li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="text-center">
            <h4 className="text-md font-semibold mb-2 text-yellow-200"> Research</h4>
            <div className="flex justify-center space-x-3 mb-2">
              <a href="https://github.com/healthcare-research" target="_blank" rel="noreferrer"
                 className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition">
                <img src={github} alt="GitHub" className="w-4 h-4" />
              </a>
              <a href="mailto:research@traumacenter.edu"
                 className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition">
                <img src={email} alt="Email" className="w-4 h-4" />
              </a>
            </div>
            <a href="mailto:team@traumacenter.edu" 
               className="inline-block bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold transition">
              Contact
            </a>
          </div>

        </div>

        {/* Bottom Copyright Row */}
        <div className="border-t border-[#6D9197] pt-2 h-1/5">
          <p className="text-xs text-gray-300 text-center">
            © 2024 Mumtaz Emergency Center Queueing Simulator | Academic Research Tool
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;