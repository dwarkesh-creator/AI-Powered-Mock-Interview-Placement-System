import { Linkedin, Mail } from 'lucide-react';

const AUTHOR = {
  name: 'Dwarkesh Rathore',
  email: 'dwarkeshrathore123@gmail.com',
  linkedin: 'https://www.linkedin.com/in/dwarkesh-rathore-50a844297/',
  photoUrl: null,
};

export default function BuiltBy({ variant = 'footer' }) {
  const isLanding = variant === 'landing';
  const iconSize = isLanding ? 'h-[18px] w-[18px]' : 'h-4 w-4';

  return (
    <div className={`inline-flex items-center gap-2 text-zinc-500 ${isLanding ? 'text-sm' : 'text-xs'}`}>
      {AUTHOR.photoUrl && (
        <img
          src={AUTHOR.photoUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      )}
      <span>Built by {AUTHOR.name}</span>
      <a
        href={`mailto:${AUTHOR.email}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Email ${AUTHOR.name}`}
        className="transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:text-zinc-200"
      >
        <Mail className={iconSize} strokeWidth={1.6} />
      </a>
      <a
        href={AUTHOR.linkedin}
        target="_blank"
        rel="noreferrer"
        aria-label={`${AUTHOR.name} on LinkedIn`}
        className="transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:text-zinc-200"
      >
        <Linkedin className={iconSize} strokeWidth={1.6} />
      </a>
    </div>
  );
}
