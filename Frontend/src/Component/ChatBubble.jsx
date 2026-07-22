/**
 * Single message bubble for the NilGen chat. `role` is either
 * 'user' or 'bot' — styling and alignment flip accordingly. User
 * bubbles reuse the same bg-white/text-black treatment as primary
 * buttons elsewhere, so "your own input" reads consistently app-wide.
 */
export default function ChatBubble({ role, content }) {
  const isUser = role === 'user';
  
  // Format content to preserve line breaks and add spacing
  const formatContent = (text) => {
    return text.split('\n').map((line, index, array) => (
      <span key={index}>
        {line}
        {index < array.length - 1 && <><br /><br /></>}
      </span>
    ));
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-white text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-200'
        }`}
      >
        {formatContent(content)}
      </div>
    </div>
  );
}
