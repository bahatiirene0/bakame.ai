/**
 * n8n Workflow Registry
 *
 * Defines available workflows and their triggers for intent matching.
 * This allows Bakame to intelligently route queries to the right workflow.
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  nameRw: string;
  description: string;
  category: 'knowledge' | 'action' | 'media' | 'research' | 'code';
  triggers: string[]; // Keywords/phrases that trigger this workflow
  triggerPatterns?: RegExp[]; // Regex patterns for more complex matching
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'file';
    required: boolean;
    description: string;
  }[];
  responseType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'data';
  estimatedTime: string; // e.g., "2-5s"
  costLevel: 'free' | 'low' | 'medium' | 'high';
  enabled: boolean;
}

/**
 * Workflow Registry - All available n8n workflows
 */
export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  // ============================================
  // KNOWLEDGE WORKFLOWS
  // ============================================
  {
    id: 'bakame-tax',
    name: 'Rwanda Tax Info',
    nameRw: 'Amakuru y\'Imisoro',
    description: 'Rwanda tax information from RRA (VAT, income tax, TIN, filing)',
    category: 'knowledge',
    triggers: [
      'tax', 'imisoro', 'vat', 'rra', 'tin', 'tax rate', 'umusoro',
      'filing', 'ebm', 'withholding', 'paye', 'customs', 'import duty',
      'kubara imisoro', 'kwishyura imisoro'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-gov-services',
    name: 'Government Services',
    nameRw: 'Serivisi za Leta',
    description: 'Irembo services, documents, registration procedures',
    category: 'knowledge',
    triggers: [
      'irembo', 'government', 'leta', 'passport', 'id card', 'indangamuntu',
      'birth certificate', 'icyemezo', 'permit', 'license', 'uruhushya',
      'registration', 'kwiyandikisha', 'rdb', 'business registration'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-business',
    name: 'Business & Finance',
    nameRw: 'Ubucuruzi n\'Imari',
    description: 'Business registration, banking, MoMo, investment',
    category: 'knowledge',
    triggers: [
      'business', 'ubucuruzi', 'company', 'sosiyete', 'bank', 'banki',
      'momo', 'mobile money', 'airtel money', 'investment', 'ishoramari',
      'loan', 'inguzanyo', 'import', 'export', 'trade'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-health',
    name: 'Health Guide',
    nameRw: 'Ubujyanama bw\'Ubuzima',
    description: 'Health information, hospitals, insurance (Mutuelle)',
    category: 'knowledge',
    triggers: [
      'health', 'ubuzima', 'hospital', 'ibitaro', 'clinic', 'kliniki',
      'mutuelle', 'insurance', 'ubwishingizi', 'doctor', 'muganga',
      'medicine', 'imiti', 'pharmacy', 'farumasi'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-education',
    name: 'Education',
    nameRw: 'Uburezi',
    description: 'Schools, exams, university, scholarships',
    category: 'knowledge',
    triggers: [
      'education', 'uburezi', 'school', 'ishuri', 'university', 'kaminuza',
      'exam', 'ikizami', 'scholarship', 'bourse', 'admission', 'kwinjira',
      'student', 'umunyeshuri', 'teacher', 'mwarimu'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-police',
    name: 'Police Services',
    nameRw: 'Serivisi za Polisi',
    description: 'Police clearance, traffic, reporting incidents',
    category: 'knowledge',
    triggers: [
      'police', 'polisi', 'clearance', 'ubuziranenge', 'traffic', 'umuhanda',
      'accident', 'impanuka', 'report', 'gutanga ikirego', 'crime',
      'emergency', 'byihutirwa', '112', '113'
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },

  // ============================================
  // RESEARCH WORKFLOWS
  // ============================================
  {
    id: 'bakame-web-search',
    name: 'Web Search',
    nameRw: 'Gushakisha kuri Internet',
    description: 'Search the web for current information',
    category: 'research',
    triggers: [
      'search', 'gushakisha', 'find', 'shakisha', 'lookup', 'google',
      'what is', 'who is', 'when', 'where', 'latest', 'news', 'amakuru'
    ],
    triggerPatterns: [
      /^(what|who|when|where|how|why)\s/i,
      /search\s(for|about)/i,
    ],
    responseType: 'text',
    estimatedTime: '2-5s',
    costLevel: 'low',
    enabled: true,
  },
  {
    id: 'bakame-news',
    name: 'Rwanda News',
    nameRw: 'Amakuru y\'u Rwanda',
    description: 'Latest news from Rwanda',
    category: 'research',
    triggers: [
      'news', 'amakuru', 'headlines', 'latest', 'today', 'uyu munsi',
      'new times', 'igihe', 'rwanda news'
    ],
    responseType: 'text',
    estimatedTime: '2-4s',
    costLevel: 'low',
    enabled: true,
  },

  // ============================================
  // MEDIA WORKFLOWS
  // ============================================
  {
    id: 'bakame-image-generate',
    name: 'Image Generation',
    nameRw: 'Gukora Ishusho',
    description: 'Generate images from text descriptions',
    category: 'media',
    triggers: [
      'generate image', 'create image', 'draw', 'make picture', 'ishusho',
      'gukora ishusho', 'create picture', 'design', 'illustration'
    ],
    triggerPatterns: [
      /^(generate|create|draw|make|design)\s.*(image|picture|photo|illustration)/i,
      /^(image|picture)\s(of|for)/i,
    ],
    parameters: [
      { name: 'prompt', type: 'string', required: true, description: 'Image description' },
      { name: 'style', type: 'string', required: false, description: 'Art style' },
    ],
    responseType: 'image',
    estimatedTime: '5-15s',
    costLevel: 'low',
    enabled: true,
  },
  {
    id: 'bakame-image-edit',
    name: 'Image Editing',
    nameRw: 'Guhindura Ishusho',
    description: 'Edit images (remove background, upscale, enhance)',
    category: 'media',
    triggers: [
      'edit image', 'remove background', 'upscale', 'enhance', 'improve',
      'guhindura ishusho', 'fix image', 'restore photo'
    ],
    parameters: [
      { name: 'image', type: 'file', required: true, description: 'Image to edit' },
      { name: 'action', type: 'string', required: true, description: 'Edit action' },
    ],
    responseType: 'image',
    estimatedTime: '5-20s',
    costLevel: 'low',
    enabled: true,
  },
  {
    id: 'bakame-video-generate',
    name: 'Video Generation',
    nameRw: 'Gukora Video',
    description: 'Generate videos from text or images',
    category: 'media',
    triggers: [
      'generate video', 'create video', 'make video', 'video',
      'gukora video', 'animate', 'animation'
    ],
    triggerPatterns: [
      /^(generate|create|make)\s.*(video|animation)/i,
    ],
    parameters: [
      { name: 'prompt', type: 'string', required: true, description: 'Video description' },
      { name: 'image', type: 'file', required: false, description: 'Source image' },
    ],
    responseType: 'video',
    estimatedTime: '30-120s',
    costLevel: 'medium',
    enabled: true,
  },
  {
    id: 'bakame-tts',
    name: 'Text to Speech',
    nameRw: 'Gusoma',
    description: 'Convert text to spoken audio',
    category: 'media',
    triggers: [
      'speak', 'say', 'read aloud', 'text to speech', 'tts', 'audio',
      'gusoma', 'vuga', 'voice'
    ],
    parameters: [
      { name: 'text', type: 'string', required: true, description: 'Text to speak' },
      { name: 'voice', type: 'string', required: false, description: 'Voice style' },
    ],
    responseType: 'audio',
    estimatedTime: '3-10s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-music',
    name: 'Music Generation',
    nameRw: 'Gukora Umuziki',
    description: 'Generate music from text descriptions',
    category: 'media',
    triggers: [
      'generate music', 'create music', 'make music', 'compose',
      'gukora umuziki', 'song', 'indirimbo', 'beat'
    ],
    parameters: [
      { name: 'prompt', type: 'string', required: true, description: 'Music description' },
      { name: 'duration', type: 'number', required: false, description: 'Duration in seconds' },
    ],
    responseType: 'audio',
    estimatedTime: '10-30s',
    costLevel: 'low',
    enabled: true,
  },

  // ============================================
  // CODE WORKFLOWS
  // ============================================
  {
    id: 'bakame-code-execute',
    name: 'Code Execution',
    nameRw: 'Gukoresha Code',
    description: 'Execute code snippets (Python, JavaScript)',
    category: 'code',
    triggers: [
      'run code', 'execute', 'python', 'javascript', 'code',
      'calculate', 'kubara', 'compute'
    ],
    triggerPatterns: [
      /```(python|javascript|js)/i,
      /^run\s/i,
    ],
    parameters: [
      { name: 'code', type: 'string', required: true, description: 'Code to execute' },
      { name: 'language', type: 'string', required: false, description: 'Programming language' },
    ],
    responseType: 'data',
    estimatedTime: '2-10s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-data-analyze',
    name: 'Data Analysis',
    nameRw: 'Gusesengura Amakuru',
    description: 'Analyze data files (CSV, Excel)',
    category: 'code',
    triggers: [
      'analyze', 'gusesengura', 'data', 'csv', 'excel', 'chart',
      'statistics', 'graph', 'trend'
    ],
    parameters: [
      { name: 'file', type: 'file', required: true, description: 'Data file' },
      { name: 'task', type: 'string', required: false, description: 'Analysis task' },
    ],
    responseType: 'data',
    estimatedTime: '5-30s',
    costLevel: 'low',
    enabled: true,
  },

  // ============================================
  // ACTION WORKFLOWS
  // ============================================
  {
    id: 'bakame-weather',
    name: 'Weather',
    nameRw: 'Ikirere',
    description: 'Current weather in Rwanda',
    category: 'action',
    triggers: [
      'weather', 'ikirere', 'temperature', 'ubushyuhe', 'rain', 'imvura',
      'forecast', 'kigali weather', 'rwanda weather'
    ],
    parameters: [
      { name: 'location', type: 'string', required: false, description: 'City name' },
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-currency',
    name: 'Currency Exchange',
    nameRw: 'Igiciro cy\'Ifaranga',
    description: 'Currency exchange rates for RWF',
    category: 'action',
    triggers: [
      'currency', 'ifaranga', 'exchange rate', 'igiciro', 'dollar', 'usd',
      'euro', 'rwf', 'convert', 'guhindura'
    ],
    parameters: [
      { name: 'from', type: 'string', required: false, description: 'From currency' },
      { name: 'to', type: 'string', required: false, description: 'To currency' },
      { name: 'amount', type: 'number', required: false, description: 'Amount' },
    ],
    responseType: 'text',
    estimatedTime: '1-2s',
    costLevel: 'free',
    enabled: true,
  },
  {
    id: 'bakame-translate',
    name: 'Translation',
    nameRw: 'Guhindura Ururimi',
    description: 'Translate between languages',
    category: 'action',
    triggers: [
      'translate', 'guhindura', 'translation', 'in english', 'in kinyarwanda',
      'mu cyongereza', 'mu kinyarwanda', 'meaning'
    ],
    parameters: [
      { name: 'text', type: 'string', required: true, description: 'Text to translate' },
      { name: 'from', type: 'string', required: false, description: 'Source language' },
      { name: 'to', type: 'string', required: false, description: 'Target language' },
    ],
    responseType: 'text',
    estimatedTime: '1-3s',
    costLevel: 'free',
    enabled: true,
  },
];

/**
 * Get all enabled workflows
 */
export function getEnabledWorkflows(): WorkflowDefinition[] {
  return WORKFLOW_REGISTRY.filter(w => w.enabled);
}

/**
 * Get workflow by ID
 */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY.find(w => w.id === id);
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: WorkflowDefinition['category']): WorkflowDefinition[] {
  return WORKFLOW_REGISTRY.filter(w => w.enabled && w.category === category);
}
