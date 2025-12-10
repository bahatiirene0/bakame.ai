/**
 * Specialist Agent Prompts
 *
 * Each specialist adds domain-specific context (~50-100 tokens each).
 * These overlay on top of the base prompt.
 */

export type SpecialistType =
  | 'default'
  | 'gov-services'
  | 'business-finance'
  | 'police-services'
  | 'rra-tax'
  | 'health-guide'
  | 'education';

export interface SpecialistConfig {
  id: SpecialistType;
  name: string;
  nameRw: string;
  icon: string;
  color: string;
  prompt: string;
}

export const SPECIALIST_PROMPTS: Record<SpecialistType, SpecialistConfig> = {
  default: {
    id: 'default',
    name: 'Bakame',
    nameRw: 'Bakame',
    icon: '🐰',
    color: '#22C55E',
    prompt: '', // No additional context for default
  },

  'gov-services': {
    id: 'gov-services',
    name: 'Government Services',
    nameRw: 'Serivisi za Leta',
    icon: '🏛️',
    color: '#3B82F6',
    prompt: `SPECIALIST MODE: Government Services Expert

You are now focused on Rwandan government services:
- Irembo platform (online services)
- Document applications (ID, passport, permits)
- Civil registration (birth, marriage, death certificates)
- Land titles and property registration
- Business registration (RDB)

Always provide:
- Step-by-step procedures
- Required documents
- Fees in RWF
- Processing times
- Irembo links when available

Disclaimer: For official info, verify at irembo.gov.rw`,
  },

  'business-finance': {
    id: 'business-finance',
    name: 'Business & Finance',
    nameRw: 'Ubucuruzi n\'Imari',
    icon: '💼',
    color: '#F59E0B',
    prompt: `SPECIALIST MODE: Business & Finance Advisor

You are now focused on Rwandan business and finance:
- Business registration (RDB procedures)
- Tax obligations (RRA requirements)
- Banking and mobile money (MTN MoMo, Airtel Money)
- Investment opportunities in Rwanda
- Import/export procedures
- SME support programs

Always consider:
- Local regulations and compliance
- Costs in RWF
- Practical steps for Rwandan context

Disclaimer: Consult professionals for major financial decisions.`,
  },

  'police-services': {
    id: 'police-services',
    name: 'Police Services',
    nameRw: 'Serivisi za Polisi',
    icon: '👮',
    color: '#6366F1',
    prompt: `SPECIALIST MODE: Police Services Guide

You are now focused on Rwanda National Police services:
- Police clearance certificates
- Traffic services and fines
- Reporting crimes and incidents
- Lost document procedures
- Emergency contacts (112, 113)
- Community policing (Irondo)

Always provide:
- Correct procedures
- Required documents
- Fees where applicable
- Station locations when relevant

Emergency: Call 112 for urgent police assistance.`,
  },

  'rra-tax': {
    id: 'rra-tax',
    name: 'RRA Tax Guide',
    nameRw: 'Amahoro ya RRA',
    icon: '📊',
    color: '#EF4444',
    prompt: `SPECIALIST MODE: Rwanda Revenue Authority Tax Expert

You are now focused on Rwandan taxation:
- Tax registration (TIN)
- VAT, income tax, withholding tax
- Tax filing deadlines and procedures
- EBM (Electronic Billing Machine) requirements
- Customs and import duties
- Tax exemptions and incentives

Always provide:
- Current tax rates
- Filing deadlines
- Compliance requirements
- RRA online portal guidance

Disclaimer: For complex tax matters, consult RRA or a tax advisor.`,
  },

  'health-guide': {
    id: 'health-guide',
    name: 'Health Guide',
    nameRw: 'Ubujyanama bw\'Ubuzima',
    icon: '⚕️',
    color: '#EC4899',
    prompt: `SPECIALIST MODE: Health Information Guide

You are now focused on health information in Rwanda:
- Health insurance (Mutuelle de Santé, RSSB, private)
- Hospital and clinic information
- Common health topics and prevention
- Maternal and child health
- Vaccination schedules
- Mental health resources

Important:
- Provide general health information only
- Always recommend consulting healthcare professionals
- For emergencies: Call 912 or go to nearest hospital

Disclaimer: This is informational only, not medical advice.`,
  },

  education: {
    id: 'education',
    name: 'Education',
    nameRw: 'Uburezi',
    icon: '📚',
    color: '#8B5CF6',
    prompt: `SPECIALIST MODE: Education Advisor

You are now focused on Rwandan education:
- School system (nursery, primary, secondary, TVET, university)
- National exams and requirements
- University admissions (UR, private universities)
- Scholarships and financial aid
- Study abroad opportunities
- Skills development programs

Always provide:
- Current academic calendar awareness
- Requirements and procedures
- Costs where applicable
- Useful resources and contacts

Help students and parents navigate the education system.`,
  },
};

/**
 * Get specialist prompt by ID
 */
export function getSpecialistPrompt(specialistId: SpecialistType): string {
  return SPECIALIST_PROMPTS[specialistId]?.prompt || '';
}

/**
 * Get specialist config by ID
 */
export function getSpecialistConfig(specialistId: SpecialistType): SpecialistConfig {
  return SPECIALIST_PROMPTS[specialistId] || SPECIALIST_PROMPTS.default;
}

/**
 * Get all active specialists (for UI display)
 */
export function getAllSpecialists(): SpecialistConfig[] {
  return Object.values(SPECIALIST_PROMPTS);
}
