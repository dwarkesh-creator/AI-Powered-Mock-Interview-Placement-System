/**
 * Client-side mock data layer.
 *
 * Every export here mirrors the shape the real backend is expected to
 * return. Replace these with real fetch()/axios calls once those
 * endpoints exist — the components consuming them shouldn't need to
 * change beyond swapping the import for an API call.
 */

export const currentUser = {
  name: 'Dwarkesh Rathore',
  year: '3rd Year',
  branch: 'ECE',
};

export const dashboardStats = {
  latestScore: { value: 78, outOf: 100, trend: 6 },
  placementProbability: { value: 82, label: 'High', trend: 4 },
  interviewsCompleted: { value: 12, trend: null },
};

export const recentInterviews = [
  { id: 1, role: 'SDE Intern', date: 'Jul 10, 2026', score: 78 },
  { id: 2, role: 'Data Analyst', date: 'Jul 4, 2026', score: 71 },
  { id: 3, role: 'ML Engineer', date: 'Jun 27, 2026', score: 65 },
  { id: 4, role: 'Embedded Systems', date: 'Jun 18, 2026', score: 74 },
];

export const interviewQuestions = [
  'Tell me about a project where you had to debug a particularly tricky issue. What was your process?',
  'Why do you want to work in this role, and what makes you a strong fit for our team?',
  'Describe a time you disagreed with a teammate about a technical decision. How did you resolve it?',
  'Walk me through how you would design a simple rate limiter for a public API.',
  "What's a technical concept you had to teach yourself recently, and how did you approach learning it?",
];

export const targetRoles = [
  'Software Engineer (SDE)',
  'Data Analyst / Data Science',
  'ML Engineer',
  'Embedded Systems Engineer',
  'Core / Electrical Engineer',
];

export const botIntroMessage = {
  id: 'intro',
  role: 'bot',
  content:
    "Hi! Fill in your metrics on the left and I'll estimate your placement readiness — or just ask me anything about interview prep, resumes, or which roles fit your skill set.",
};

const BOT_REPLIES = [
  "That's a solid foundation. Focus your next few weeks on DSA consistency — two problems a day compounds fast.",
  'A good CGPA alone rarely moves the needle — pairing it with 2-3 shipped projects usually does more for shortlists.',
  'For that role, interviewers tend to probe fundamentals early. Want a few practice questions to warm up on?',
  'Worth adding any open-source contributions or hackathon wins to your profile — recruiters skim for proof of initiative.',
  "I'd suggest a mock interview this week while the material's still fresh. Ready when you are.",
];

/** Cycles through canned replies so the chat feels varied, not random-random. */
export function getMockBotReply(messageCount) {
  return BOT_REPLIES[messageCount % BOT_REPLIES.length];
}

/**
 * Placeholder placement-probability estimator. Purely illustrative —
 * the real model will replace this with an actual prediction from
 * CGPA, skills, and role fit.
 */
export function estimatePlacementProbability({ cgpa, skills, targetRole }) {
  if (!cgpa || skills.length === 0 || !targetRole) return null;
  const cgpaScore = Math.min(cgpa / 10, 1) * 60;
  const skillsScore = Math.min(skills.length / 6, 1) * 40;
  const total = Math.round(cgpaScore + skillsScore);
  const label = total >= 75 ? 'High' : total >= 50 ? 'Medium' : 'Building';
  return { value: total, label };
}
