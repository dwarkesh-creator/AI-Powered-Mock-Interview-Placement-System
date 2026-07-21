import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, BriefcaseBusiness, Building2 } from 'lucide-react';
import { getAllCompanies, getTopTechCompanies, getIndianServiceCompanies, getFinanceCompanies, getConsultingCompanies } from '../data/companies.js';

const ROLE_GROUPS = [
  {
    label: 'Data & Intelligence',
    roles: [
      {
        id: 'data-analyst',
        title: 'Data Analyst',
        focus: 'data extraction, cleaning, SQL, basic Python or R, A/B testing, and statistical analysis for business decisions',
      },
      {
        id: 'bi-analyst',
        title: 'Business Intelligence (BI) Analyst',
        focus: 'scalable reporting, dashboards, Tableau, Power BI, Looker, data modeling, and communicating metrics to non-technical leaders',
      },
    ],
  },
  {
    label: 'Systems & Strategy',
    roles: [
      {
        id: 'systems-analyst',
        title: 'Systems Analyst',
        focus: 'evaluating IT systems, solution design, system architecture, process flow diagrams, and IT infrastructure',
      },
      {
        id: 'business-analyst',
        title: 'Business Analyst (Tech/IT)',
        focus: 'requirements gathering, technical specifications, Agile methodologies, user stories, and stakeholder management scenarios',
      },
    ],
  },
  {
    label: 'Security & Operations',
    roles: [
      {
        id: 'soc-analyst',
        title: 'Cybersecurity Analyst (SOC Analyst)',
        focus: 'network traffic monitoring, threat identification, network protocols, intrusion detection, malware analysis, and incident response',
      },
    ],
  },
  {
    label: 'Core Software Development',
    roles: [
      {
        id: 'frontend-engineer',
        title: 'Frontend Engineer',
        focus: 'UI and UX, browser performance, DOM manipulation, accessibility, and React, Vue, or Angular frameworks',
      },
      {
        id: 'backend-engineer',
        title: 'Backend Engineer',
        focus: 'APIs, databases, server logic, scalability, concurrency, and Java, Python, Go, or Node.js',
      },
      {
        id: 'full-stack-engineer',
        title: 'Full Stack Engineer',
        focus: 'frontend and backend concepts, end-to-end feature development, APIs, databases, and system design',
      },
    ],
  },
  {
    label: 'Data & Artificial Intelligence',
    roles: [
      {
        id: 'data-engineer',
        title: 'Data Engineer',
        focus: 'ETL pipelines, data warehousing, distributed computing with Spark or Hadoop, and advanced SQL or NoSQL optimization',
      },
      {
        id: 'ml-engineer',
        title: 'Machine Learning (ML) Engineer',
        focus: 'production model deployment, MLOps, machine-learning algorithms, and TensorFlow or PyTorch',
      },
      {
        id: 'ai-prompt-engineer',
        title: 'AI / Prompt Engineer',
        focus: 'LLM integration, fine-tuning, retrieval-augmented generation, prompt optimization, evaluation, and AI safety',
      },
    ],
  },
  {
    label: 'Infrastructure & Reliability',
    roles: [
      {
        id: 'devops-engineer',
        title: 'DevOps Engineer',
        focus: 'CI/CD pipelines, Docker, Kubernetes, AWS, GCP, Azure, and infrastructure as code with Terraform',
      },
      {
        id: 'sre',
        title: 'Site Reliability Engineer (SRE)',
        focus: 'system uptime, incident response, monitoring, observability, SLOs, and distributed-system scaling',
      },
    ],
  },
  {
    label: 'Specialized Platforms & Quality',
    roles: [
      {
        id: 'mobile-engineer',
        title: 'Mobile Engineer (iOS / Android)',
        focus: 'mobile paradigms, memory management, responsive UI, and Swift, Kotlin, or Flutter',
      },
      {
        id: 'security-engineer',
        title: 'Security Engineer',
        focus: 'cryptography, network security, vulnerability testing, penetration testing, and secure coding practices',
      },
      {
        id: 'sdet',
        title: 'Software Development Engineer in Test (SDET)',
        focus: 'automated testing frameworks, quality-assurance pipelines, test strategy, and test infrastructure',
      },
    ],
  },
  {
    label: 'Leadership & Strategy',
    roles: [
      {
        id: 'engineering-manager',
        title: 'Engineering Manager',
        focus: 'team building, conflict resolution, project delivery, performance management, and engineering leadership',
      },
      {
        id: 'tech-lead-staff-engineer',
        title: 'Tech Lead / Staff Engineer',
        focus: 'high-level architecture, technical strategy, cross-team collaboration, and ambiguous engineering problems',
      },
    ],
  },
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', description: 'Core concepts and guided scenarios.' },
  { id: 'intermediate', label: 'Intermediate', description: 'Practical questions and trade-offs.' },
  { id: 'advanced', label: 'Advanced', description: 'Depth, architecture, and ambiguity.' },
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('general');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [activeView, setActiveView] = useState('role'); // 'role' or 'company'

  const selectedRole = useMemo(
    () => ROLE_GROUPS.flatMap((group) => group.roles).find((role) => role.id === selectedRoleId),
    [selectedRoleId],
  );

  const topTechCompanies = useMemo(() => getTopTechCompanies(), []);
  const indianCompanies = useMemo(() => getIndianServiceCompanies(), []);
  const financeCompanies = useMemo(() => getFinanceCompanies(), []);
  const consultingCompanies = useMemo(() => getConsultingCompanies(), []);
  const allCompanies = useMemo(() => getAllCompanies(), []);
  const selectedCompany = useMemo(
    () => allCompanies.find((c) => c.id === selectedCompanyId),
    [selectedCompanyId, allCompanies],
  );

  function startInterview() {
    if (!selectedRole) return;

    navigate('/interview', {
      state: {
        interviewConfig: {
          role: selectedRole.title,
          topic: selectedRole.focus,
          difficulty,
          totalQuestions: 5,
          company: selectedCompany, // Pass company data
        },
      },
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-grain px-6 py-8 pb-20 text-zinc-50 lg:px-12 lg:py-12 lg:pb-24">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to dashboard
        </button>

        <header className="mt-10 max-w-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <BriefcaseBusiness className="h-5 w-5 text-zinc-300" strokeWidth={1.5} />
          </div>
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Interview setup</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Customize your interview experience
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Select your target role and company to get tailored questions that match real interview patterns and evaluation criteria.
          </p>
        </header>

        {/* View Toggle */}
        <section className="mt-10">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-1.5">
            <button
              type="button"
              onClick={() => setActiveView('role')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeView === 'role'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BriefcaseBusiness className="h-4 w-4" strokeWidth={1.75} />
              Target Role
            </button>
            <button
              type="button"
              onClick={() => setActiveView('company')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                activeView === 'company'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Building2 className="h-4 w-4" strokeWidth={1.75} />
              Target Company
            </button>
          </div>
        </section>

        {/* Target Role View */}
        {activeView === 'role' && (
          <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-200">Target role</h2>
            <span className="text-xs text-zinc-500">Select one</span>
          </div>

          <div className="mt-5 space-y-8">
            {ROLE_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{group.label}</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.roles.map((role) => {
                    const selected = selectedRoleId === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        aria-pressed={selected}
                        className={`relative min-h-32 rounded-2xl border p-4 text-left transition-colors ${
                          selected
                            ? 'border-white bg-white text-black'
                            : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                        }`}
                      >
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                          </span>
                        )}
                        <p className="pr-7 text-sm font-medium">{role.title}</p>
                        <p className={`mt-2 text-xs leading-relaxed ${selected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                          {role.focus}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Target Company View */}
        {activeView === 'company' && (
          <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                <Building2 className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
              </div>
              <h2 className="text-sm font-medium text-zinc-200">Target Company</h2>
            </div>
            <span className="text-xs text-zinc-500">Choose interview style</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Practice with company-specific interview patterns. Each company has unique question styles and evaluation criteria.
          </p>

          {/* Top Tech Companies */}
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Top Tech Giants</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topTechCompanies.map((company) => {
                const selected = selectedCompanyId === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    aria-pressed={selected}
                    className={`group relative rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-white bg-white text-black shadow-lg'
                        : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{company.logo}</span>
                      <div className="flex-1 pr-5">
                        <p className="text-sm font-semibold">{company.displayName}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Finance & Consulting Combined */}
          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Finance & Consulting</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...financeCompanies, ...consultingCompanies].map((company) => {
                const selected = selectedCompanyId === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    aria-pressed={selected}
                    className={`group relative rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-white bg-white text-black shadow-lg'
                        : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{company.logo}</span>
                      <div className="flex-1 pr-5">
                        <p className="text-sm font-semibold">{company.displayName}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Indian IT Services */}
          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Indian IT Services</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {indianCompanies.map((company) => {
                const selected = selectedCompanyId === company.id;
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(company.id)}
                    aria-pressed={selected}
                    className={`group relative rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-white bg-white text-black shadow-lg'
                        : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{company.logo}</span>
                      <div className="flex-1 pr-5">
                        <p className="text-sm font-semibold">{company.displayName}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* General Practice */}
          <div className="mt-5">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">General</h3>
            <div className="mt-3">
              {(() => {
                const company = allCompanies.find((c) => c.id === 'general');
                const selected = selectedCompanyId === 'general';
                return (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyId('general')}
                    aria-pressed={selected}
                    className={`group relative w-full rounded-xl border p-3.5 text-left transition-all sm:w-auto ${
                      selected
                        ? 'border-white bg-white text-black shadow-lg'
                        : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      </span>
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{company.logo}</span>
                      <div className="flex-1 pr-5">
                        <p className="text-sm font-semibold">{company.displayName}</p>
                        <p className={`mt-0.5 text-[10px] ${selected ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          Balanced interview preparation
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>
        </section>
        )}

        <section className="mt-8 border-t border-white/10 pt-8">
          <h2 className="text-sm font-medium text-zinc-200">Difficulty</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DIFFICULTIES.map((option) => {
              const selected = difficulty === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDifficulty(option.id)}
                  aria-pressed={selected}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    selected
                      ? 'border-white bg-white text-black'
                      : 'border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className={`mt-1 text-xs ${selected ? 'text-zinc-700' : 'text-zinc-500'}`}>{option.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 bg-zinc-950 py-5">
          <p className="hidden text-sm text-zinc-500 sm:block">
            {selectedRole && selectedCompany
              ? `${selectedRole.title} · ${selectedCompany.displayName} · ${difficulty}`
              : 'Choose a role to continue'}
          </p>
          <button
            type="button"
            onClick={startInterview}
            disabled={!selectedRole}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start 5-question interview
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
