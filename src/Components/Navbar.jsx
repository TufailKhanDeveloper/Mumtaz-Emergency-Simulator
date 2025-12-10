import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="bg-gradient-to-r from-[#6D9197] to-[#2F575D] text-white py-4 sticky top-0 shadow-md z-10">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link to="/" className="text-3xl font-bold tracking-wide hover:text-yellow-200 transition duration-300">
          Mumtaz Emergency Simulator
        </Link>
        <nav>
          <ul className="flex gap-10">
            <li>
              <Link to="/" className="hover:text-yellow-200 transition duration-300 font-semibold">
                Home
              </Link>
            </li>
            <li>
              <a href="#features" className="hover:text-yellow-200 transition duration-300 font-semibold">
                Features
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-yellow-200 transition duration-300 font-semibold">
                How It Works
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-yellow-200 transition duration-300 font-semibold">
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;