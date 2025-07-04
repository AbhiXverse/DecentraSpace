// src/components/Footer.tsx
import React from 'react';
import { Video } from 'lucide-react';

const Footer: React.FC = () => {
  const technologies = [
    { name: 'IPFS', color: 'bg-purple-500' },
    { name: 'Huddle01', color: 'bg-orange-600' },
    { name: 'Lighthouse', color: 'bg-teal-600' },
  ];

  return (
    <footer className="bg-slate-900 border-t border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Brand & Description */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                DecentraSpace
              </span>
            </div>
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
              Empowering creators through Web3 technology. Build, share, and monetize your content on the decentralized web with Ethereum.
            </p>

            {/* Technology Stack */}
            <div>
              <p className="text-gray-500 mb-4 font-medium">Built With</p>
              <div className="flex flex-wrap gap-4">
                {technologies.map((tech) => (
                  <span
                    key={tech.name}
                    className={`px-4 py-2 ${tech.color} rounded-full text-white font-semibold text-sm hover:scale-105 transition-transform`}
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Features & Links */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>• Upload & monetize content</li>
                <li>• Live streaming with tips</li>
                <li>• Decentralized storage</li>
                <li>• Direct ETH payments</li>
                <li>• Creator discovery</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Network</h4>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Ethereum Mainnet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Sepolia Testnet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>IPFS Storage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-slate-700 mt-12 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2025 DecentraSpace. All rights reserved. Built for the future of decentralized content creation.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;