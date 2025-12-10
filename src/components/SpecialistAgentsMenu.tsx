/**
 * SpecialistAgentsMenu Component
 *
 * Clean dropdown menu for specialist AI agents
 * - Only shows for logged-in users
 * - Burger icon in header
 * - Dropdown with agent list
 * - Hover tooltip for capabilities
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';

// Agent definition
interface AgentInfo {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  capabilities: string[];
  isPremium: boolean;
}

// Specialist agents
const AGENTS: AgentInfo[] = [
  {
    id: 'default',
    name: 'Bakame',
    nameEn: 'General Assistant',
    icon: '🐰',
    color: '#10B981',
    description: 'Umufasha rusange wa AI',
    capabilities: [
      'Ibibazo byose rusange',
      'Gufasha mu kwandika',
      'Gusobanura ibintu',
      'Imibare yoroshye',
    ],
    isPremium: false,
  },
  {
    id: 'gov-services',
    name: 'Serivisi za Leta',
    nameEn: 'Government Services',
    icon: '🏛️',
    color: '#3B82F6',
    description: 'Ubufasha ku bikorwa bya Leta',
    capabilities: [
      'Ibyangombwa (ID, Passport)',
      'Kwandikisha umushinga',
      'Serivisi za Irembo',
      'Amategeko y\'ibanze',
    ],
    isPremium: false,
  },
  {
    id: 'business-finance',
    name: 'Ubucuruzi & Imari',
    nameEn: 'Business & Finance',
    icon: '💼',
    color: '#F59E0B',
    description: 'Ubufasha ku bucuruzi n\'imari',
    capabilities: [
      'Gutangira ubucuruzi',
      'Gukora business plan',
      'Imari y\'uruhushya',
      'Kwinjiza no gusohora',
    ],
    isPremium: false,
  },
  {
    id: 'police-services',
    name: 'Polisi y\'u Rwanda',
    nameEn: 'Police Services',
    icon: '👮',
    color: '#6366F1',
    description: 'Amakuru ku bikorwa bya Polisi',
    capabilities: [
      'Gutanga ikirego',
      'Amakuru y\'umutekano',
      'Traffic & Amategeko',
      'Serivisi za Polisi',
    ],
    isPremium: false,
  },
  {
    id: 'rra-tax',
    name: 'RRA - Imisoro',
    nameEn: 'Tax Assistant',
    icon: '📊',
    color: '#EF4444',
    description: 'Ubufasha ku misoro ya RRA',
    capabilities: [
      'Kubara imisoro',
      'VAT & PAYE',
      'Kwiyandikisha muri RRA',
      'Tax declaration',
    ],
    isPremium: false,
  },
  {
    id: 'health-guide',
    name: 'Ubuzima',
    nameEn: 'Health Guide',
    icon: '⚕️',
    color: '#EC4899',
    description: 'Amakuru ku buzima',
    capabilities: [
      'Amakuru y\'ubuzima',
      'Ibitaro & Kliniki',
      'Ubwishingizi bw\'ubuzima',
      'Ibyo kurya neza',
    ],
    isPremium: true,
  },
  {
    id: 'education',
    name: 'Uburezi',
    nameEn: 'Education',
    icon: '📚',
    color: '#8B5CF6',
    description: 'Ubufasha mu kwiga',
    capabilities: [
      'Gufasha mu masomo',
      'Ibizamini & Amanota',
      'Kwinjira mu mashuri',
      'Scholarship info',
    ],
    isPremium: false,
  },
];

export default function SpecialistAgentsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('default');
  const menuRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthStore();
  const { createSession, setAgent } = useChatStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHoveredAgent(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't render if user is not logged in
  if (!user) return null;

  const handleAgentSelect = (agent: AgentInfo) => {
    if (selectedAgentId !== agent.id) {
      setSelectedAgentId(agent.id);
      setAgent(agent.id as any);
      // Create session with agent-specific title and agent ID
      createSession(`${agent.icon} Ikiganiro gishya`, agent.id);
    }
    setIsOpen(false);
    setHoveredAgent(null);
  };

  const hoveredAgentData = AGENTS.find(a => a.id === hoveredAgent);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          transition-all duration-200
          ${isOpen
            ? 'bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-500/30'
            : 'bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10'
          }
          border border-gray-200/50 dark:border-white/10
          hover:border-green-500/30 dark:hover:border-green-500/20
        `}
      >
        {/* Burger Icon */}
        <svg
          className={`w-4 h-4 transition-colors duration-200 ${isOpen ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>

        <span className={`text-sm font-medium hidden sm:inline ${isOpen ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
          Bakame Agents
        </span>

        {/* Current agent indicator */}
        <span className="text-base">
          {AGENTS.find(a => a.id === selectedAgentId)?.icon || '🐰'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 flex gap-2 animate-fadeIn">
          {/* Agent List */}
          <div className="w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl
            border border-gray-200/50 dark:border-white/10 overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5
              bg-gradient-to-r from-green-500/5 to-blue-500/5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Specialist Agents
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Hitamo umufasha wihariye
              </p>
            </div>

            {/* Agent List */}
            <div className="py-2 max-h-[40vh] sm:max-h-[60vh] overflow-y-auto">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
                  onMouseEnter={() => setHoveredAgent(agent.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5
                    transition-all duration-150
                    ${selectedAgentId === agent.id
                      ? 'bg-gradient-to-r from-green-500/10 to-blue-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                    }
                  `}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg relative"
                    style={{ backgroundColor: `${agent.color}15` }}
                  >
                    {agent.icon}
                    {agent.isPremium && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full
                        bg-gradient-to-r from-yellow-500 to-orange-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        selectedAgentId === agent.id
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {agent.name}
                      </span>
                      {agent.isPremium && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full
                          bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {agent.nameEn}
                    </p>
                  </div>

                  {/* Selected indicator */}
                  {selectedAgentId === agent.id && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities Tooltip - shows on hover (stable, no mouseLeave on list items) */}
          {hoveredAgentData && (
            <div
              className="w-64 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl
                border border-gray-200/50 dark:border-white/10 p-4 hidden md:block"
              style={{ boxShadow: `0 10px 40px ${hoveredAgentData.color}15` }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${hoveredAgentData.color}15` }}
                >
                  {hoveredAgentData.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {hoveredAgentData.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {hoveredAgentData.description}
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Ashobora kukufasha muri:
                </p>
                <ul className="space-y-1.5">
                  {hoveredAgentData.capabilities.map((cap, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: hoveredAgentData.color }}
                      />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium notice */}
              {hoveredAgentData.isPremium && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full
                      bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      PRO
                    </span>
                    Bisaba Premium subscription
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
