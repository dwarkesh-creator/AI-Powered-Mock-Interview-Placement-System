import { useState, useRef, useEffect } from 'react';
import { X, Send, Plus, Sparkles } from 'lucide-react';
import ChatBubble from '../Component/ChatBubble.jsx';
import BuiltBy from '../Component/BuiltBy.jsx';
import { chatWithBot } from '../Hooks/apiClient.js';
import {
  targetRoles,
  botIntroMessage,
  estimatePlacementProbability,
} from '../Mockdata/Mockdata.js';

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-zinc-500 motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PlacementBot() {
  // --- Metrics form state ---
  const [cgpa, setCgpa] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [targetRole, setTargetRole] = useState('');

  // --- Chat state ---
  const [messages, setMessages] = useState([botIntroMessage]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const prediction = estimatePlacementProbability({
    cgpa: parseFloat(cgpa),
    skills,
    targetRole,
  });

  function addSkill(e) {
    e.preventDefault();
    const value = skillInput.trim();
    if (value && !skills.includes(value)) {
      setSkills([...skills, value]);
    }
    setSkillInput('');
  }

  function removeSkill(skill) {
    setSkills(skills.filter((s) => s !== skill));
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const userMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsBotTyping(true);

    try {
      // Build context from the metrics form
      const context = {};
      if (cgpa) context.cgpa = parseFloat(cgpa);
      if (skills.length > 0) context.skills = skills;
      if (targetRole) context.targetRole = targetRole;

      // Send a small conversation window so replies such as "but how?"
      // keep the topic of the previous coach response.
      const history = messages
        .filter((message) => message.id !== 'intro')
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));

      const data = await chatWithBot(text, context, history);
      const botMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: data.reply,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat failed:', err);
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: err.message || 'Sorry, that request could not be completed. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsBotTyping(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-12 lg:py-10">
      <header className="mb-6">
        <p className="text-sm text-zinc-500">Placement</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
          Career bot &amp; placement estimate
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Metrics form */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:h-[75vh] lg:min-h-[560px]">
          <h2 className="text-sm font-medium text-zinc-200">Your metrics</h2>
          <p className="mt-1 text-xs text-zinc-500">Used to estimate placement readiness.</p>

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="cgpa" className="mb-1.5 block text-xs font-medium text-zinc-400">
                CGPA (out of 10)
              </label>
              <input
                id="cgpa"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="8.4"
                className="font-data w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label htmlFor="target-role" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Target role
              </label>
              <select
                id="target-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-50"
              >
                <option value="">Select a role</option>
                {targetRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="skill-input" className="mb-1.5 block text-xs font-medium text-zinc-400">
                Skills
              </label>
              <form onSubmit={addSkill} className="flex gap-2">
                <input
                  id="skill-input"
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="e.g. React, Python"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  aria-label="Add skill"
                  className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </form>

              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-2.5 pr-1.5 text-xs text-zinc-300"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="rounded-full p-0.5 text-zinc-500 transition-colors hover:text-zinc-200"
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Estimated readiness
              </p>
              {prediction ? (
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-data text-2xl font-semibold text-zinc-50">
                    {prediction.value}%
                  </span>
                  <span className="text-sm text-zinc-400">{prediction.label}</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-600">
                  Fill in your metrics to see an estimate.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="flex h-[520px] flex-col rounded-2xl border border-white/10 bg-white/[0.02] lg:h-[75vh] lg:min-h-[560px]">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
              <Sparkles className="h-3.5 w-3.5 text-black" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-zinc-200">Career bot</span>
            <span className="ml-auto text-xs text-emerald-400/70">● AI-powered</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} role={message.role} content={message.content} />
            ))}
            {isBotTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="flex items-center gap-2 border-t border-white/10 p-4"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about resumes, roles, or prep…"
              className="w-full rounded-full border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isBotTyping}
              aria-label="Send message"
              className="flex shrink-0 items-center justify-center rounded-full bg-white p-2.5 text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>

      <footer className="mt-6 border-t border-white/10 pt-4 text-center">
        <BuiltBy />
      </footer>
    </div>
  );
}
