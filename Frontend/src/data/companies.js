/**
 * Company-specific interview configurations
 * Each company has unique interview styles, focus areas, and question patterns
 */

export const COMPANIES = {
  google: {
    id: 'google',
    name: 'Google',
    displayName: 'Google',
    logo: '🔵', // Google colors placeholder - can be replaced with actual logo
    primaryColor: '#4285F4',
    accentColor: '#EA4335',
    interviewStyle: 'analytical',
    description: 'Googleyness & Leadership, System Design, Data Structures',
    focusAreas: [
      'Algorithm complexity analysis',
      'System design and scalability',
      'Behavioral - Googleyness & Leadership',
      'Problem-solving approach',
      'Code optimization'
    ],
    questionTypes: [
      'Coding challenges',
      'System design',
      'Behavioral (STAR format)',
      'Product sense'
    ],
    interviewTips: [
      'Think aloud - explain your reasoning',
      'Ask clarifying questions before solving',
      'Consider edge cases and scalability',
      'Use proper Big O notation'
    ]
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft',
    displayName: 'Microsoft',
    logo: '🪟',
    primaryColor: '#00A4EF',
    accentColor: '#7FBA00',
    interviewStyle: 'technical-depth',
    description: 'Technical Depth, Design Patterns, Azure Knowledge',
    focusAreas: [
      'Code quality and design patterns',
      'Technical depth in your stack',
      'Azure cloud fundamentals',
      'Debugging and problem-solving',
      'Growth mindset'
    ],
    questionTypes: [
      'Deep technical coding',
      'Design patterns',
      'Behavioral',
      'Domain expertise'
    ],
    interviewTips: [
      'Show technical depth, not just breadth',
      'Explain trade-offs in your design',
      'Demonstrate learning agility',
      'Ask about team dynamics'
    ]
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    displayName: 'Amazon',
    logo: '📦',
    primaryColor: '#FF9900',
    accentColor: '#146EB4',
    interviewStyle: 'leadership-principles',
    description: '14 Leadership Principles, STAR Method, Customer Obsession',
    focusAreas: [
      '14 Leadership Principles',
      'STAR format behavioral questions',
      'Customer obsession examples',
      'Ownership and bias for action',
      'Data structures and algorithms'
    ],
    questionTypes: [
      'Behavioral (Leadership Principles)',
      'Coding (LeetCode medium/hard)',
      'System design',
      'Bar raiser round'
    ],
    interviewTips: [
      'Prepare STAR stories for each principle',
      'Show customer impact in examples',
      'Demonstrate ownership and results',
      'Be specific with metrics'
    ]
  },
  tcs: {
    id: 'tcs',
    name: 'TCS',
    displayName: 'Tata Consultancy Services',
    logo: '💼',
    primaryColor: '#0F62FE',
    accentColor: '#8A3FFC',
    interviewStyle: 'aptitude-technical',
    description: 'Aptitude, Core CS Fundamentals, Communication Skills',
    focusAreas: [
      'Quantitative aptitude',
      'Logical reasoning',
      'Core CS fundamentals (OS, DBMS, Networks)',
      'Basic programming concepts',
      'Communication skills'
    ],
    questionTypes: [
      'Aptitude and reasoning',
      'Core CS theory',
      'Basic coding',
      'HR behavioral'
    ],
    interviewTips: [
      'Focus on CS fundamentals',
      'Practice aptitude questions',
      'Clear communication is key',
      'Show willingness to learn'
    ]
  },
  infosys: {
    id: 'infosys',
    name: 'Infosys',
    displayName: 'Infosys',
    logo: '🔷',
    primaryColor: '#007CC3',
    accentColor: '#FF6B00',
    interviewStyle: 'problem-solving',
    description: 'Problem Solving, Coding Skills, HR Round',
    focusAreas: [
      'Analytical and problem-solving',
      'Programming fundamentals',
      'Verbal and written communication',
      'Adaptability and learning',
      'Team collaboration'
    ],
    questionTypes: [
      'Pseudocode and logic',
      'Basic programming',
      'Puzzle solving',
      'HR questions'
    ],
    interviewTips: [
      'Explain your thought process clearly',
      'Show problem-solving approach',
      'Demonstrate eagerness to learn',
      'Be confident and positive'
    ]
  },
  wipro: {
    id: 'wipro',
    name: 'Wipro',
    displayName: 'Wipro',
    logo: '🌐',
    primaryColor: '#7B3F00',
    accentColor: '#FF6B35',
    interviewStyle: 'technical-hr',
    description: 'Technical Skills, Domain Knowledge, Communication',
    focusAreas: [
      'Technical fundamentals',
      'Domain-specific knowledge',
      'Communication skills',
      'Professional attitude',
      'Project experience'
    ],
    questionTypes: [
      'Technical MCQs',
      'Coding basics',
      'Project discussion',
      'HR behavioral'
    ],
    interviewTips: [
      'Be thorough with your projects',
      'Speak confidently',
      'Show professional demeanor',
      'Express career goals clearly'
    ]
  },
  jpmorgan: {
    id: 'jpmorgan',
    name: 'JPMorgan',
    displayName: 'JP Morgan Chase',
    logo: '🏦',
    primaryColor: '#0066B3',
    accentColor: '#00A4E4',
    interviewStyle: 'finance-tech',
    description: 'Technical Skills, Financial Domain, Problem-Solving',
    focusAreas: [
      'Data structures and algorithms',
      'System design for financial systems',
      'Risk management concepts',
      'Market knowledge and business acumen',
      'Teamwork and leadership'
    ],
    questionTypes: [
      'Technical coding (medium-hard)',
      'System design',
      'Financial domain questions',
      'Behavioral (STAR format)'
    ],
    interviewTips: [
      'Understand financial services basics',
      'Demonstrate attention to detail',
      'Show interest in fintech',
      'Discuss trade-offs and risk'
    ]
  },
  goldman: {
    id: 'goldman',
    name: 'Goldman Sachs',
    displayName: 'Goldman Sachs',
    logo: '💼',
    primaryColor: '#003B71',
    accentColor: '#0088CE',
    interviewStyle: 'analytical-elite',
    description: 'Analytical Thinking, Market Knowledge, Technical Excellence',
    focusAreas: [
      'Advanced algorithms and optimization',
      'Low-latency systems',
      'Quantitative reasoning',
      'Market microstructure',
      'Business sense and strategy'
    ],
    questionTypes: [
      'Hard algorithmic problems',
      'Brain teasers',
      'Market scenarios',
      'Technical depth questions'
    ],
    interviewTips: [
      'Be prepared for tough technical questions',
      'Show analytical and quantitative skills',
      'Demonstrate financial market interest',
      'Think strategically'
    ]
  },
  deloitte: {
    id: 'deloitte',
    name: 'Deloitte',
    displayName: 'Deloitte',
    logo: '🎯',
    primaryColor: '#86BC25',
    accentColor: '#0076A8',
    interviewStyle: 'consulting-analytical',
    description: 'Problem-Solving, Communication, Business Acumen',
    focusAreas: [
      'Analytical and problem-solving',
      'Case study analysis',
      'Communication and presentation',
      'Business and technology consulting',
      'Team collaboration'
    ],
    questionTypes: [
      'Case studies',
      'Technical scenarios',
      'Behavioral questions',
      'Business problems'
    ],
    interviewTips: [
      'Practice case study frameworks',
      'Show structured thinking',
      'Communicate clearly and confidently',
      'Demonstrate business understanding'
    ]
  },
  accenture: {
    id: 'accenture',
    name: 'Accenture',
    displayName: 'Accenture',
    logo: '🔷',
    primaryColor: '#A100FF',
    accentColor: '#0080FF',
    interviewStyle: 'technology-consulting',
    description: 'Technology Consulting, Innovation, Digital Transformation',
    focusAreas: [
      'Technology fundamentals',
      'Digital transformation concepts',
      'Innovation mindset',
      'Client communication',
      'Adaptability and learning'
    ],
    questionTypes: [
      'Technical concepts',
      'Consulting scenarios',
      'Innovation challenges',
      'Behavioral fit'
    ],
    interviewTips: [
      'Show interest in emerging tech',
      'Demonstrate learning agility',
      'Think like a consultant',
      'Focus on client value'
    ]
  },
  general: {
    id: 'general',
    name: 'General',
    displayName: 'General Practice',
    logo: '⭐',
    primaryColor: '#6366F1',
    accentColor: '#8B5CF6',
    interviewStyle: 'balanced',
    description: 'Balanced Interview Preparation',
    focusAreas: [
      'General coding skills',
      'Problem-solving ability',
      'Communication skills',
      'Behavioral questions',
      'Technical fundamentals'
    ],
    questionTypes: [
      'Coding problems',
      'Technical concepts',
      'Behavioral questions',
      'Project discussion'
    ],
    interviewTips: [
      'Practice diverse question types',
      'Focus on fundamentals',
      'Improve communication',
      'Stay calm and confident'
    ]
  }
};

// Helper to get company by ID
export function getCompanyById(companyId) {
  return COMPANIES[companyId] || COMPANIES.general;
}

// Get all companies as array
export function getAllCompanies() {
  return Object.values(COMPANIES);
}

// Get top tech companies
export function getTopTechCompanies() {
  return [
    COMPANIES.google,
    COMPANIES.microsoft,
    COMPANIES.amazon
  ];
}

// Get Indian service companies
export function getIndianServiceCompanies() {
  return [
    COMPANIES.tcs,
    COMPANIES.infosys,
    COMPANIES.wipro
  ];
}

// Get finance companies
export function getFinanceCompanies() {
  return [
    COMPANIES.jpmorgan,
    COMPANIES.goldman
  ];
}

// Get consulting companies
export function getConsultingCompanies() {
  return [
    COMPANIES.deloitte,
    COMPANIES.accenture
  ];
}
