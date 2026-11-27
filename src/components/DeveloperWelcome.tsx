import { useEffect } from 'react';
import { ArrowRight, BookOpen, Heart, X } from 'lucide-react';
import './developer-welcome.css';

type DeveloperWelcomeProps = { username: string; onClose: () => void };

export function DeveloperWelcome({ username, onClose }: DeveloperWelcomeProps) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="developer-note-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="developer-note" role="dialog" aria-modal="true" aria-labelledby="developer-note-title">
        <header className="developer-note-topbar">
          <a className="developer-note-brand" href="/dashboard"><span><BookOpen size={17}/></span> EDVORA<span className="developer-note-brand-dot">.</span></a>
          <button className="developer-note-close" onClick={onClose} aria-label="Close welcome message"><X size={19}/></button>
        </header>
        <div className="developer-note-scroll">
          <div className="developer-note-cover"><span className="developer-note-spark">✳</span><span className="developer-note-kicker">A PERSONAL NOTE FROM THE DEVELOPER</span><h2 id="developer-note-title">Your journey<br/><em>starts here.</em></h2><span className="developer-note-cover-foot"><span/> A LITTLE NOTE, JUST FOR YOU</span></div>
          <div className="developer-note-copy">
            <p className="developer-note-salutation">Dear {username},</p>
            <p>First of all, welcome to EDVORA!</p>
            <p>Before you explore everything this platform has to offer, I want to share something with you.</p>
            <p>I know that every student has a different journey. Some days you feel confident, some days you question yourself, and sometimes, despite giving your best, things don’t go exactly as planned.</p>
            <p>But I want you to remember one thing: <strong>your academic results do not define your entire potential, and one difficult day does not determine your future.</strong></p>
            <p>EDVORA was created with a simple thought — learning should feel more organised, opportunities should be easier to access, and every student should have the tools to move forward with confidence.</p>
            <p>I built this platform not because I have all the answers, but because I have been a student too. I understand the importance of having the right resources, a little direction and an environment that encourages you to keep going.</p>
            <p>As you use EDVORA, don’t just focus on completing chapters, solving questions or tracking numbers. Focus on understanding, improving and becoming a little better than you were yesterday.</p>
            <p>There will always be someone ahead of you, and there will always be challenges along the way. Don’t let either discourage you. Move at your own pace, stay curious, remain consistent and never underestimate what small efforts can achieve over time.</p>
            <blockquote>“You don’t have to figure everything out today. You just have to keep moving forward.”</blockquote>
            <p>I hope EDVORA becomes a small but meaningful part of your academic journey. If this platform makes even one concept clearer, one study session more productive or one student’s journey a little easier, then every effort behind building it will have been worthwhile.</p>
            <p>Thank you for being here. Thank you for being a part of EDVORA.</p>
            <p className="developer-note-signoff">Your journey matters. Make it count.</p>
            <div className="developer-note-signature"><span>With best wishes,</span><strong>From Ishan</strong><span>Founder &amp; Developer, EDVORA</span></div>
            <div className="developer-note-motto"><Heart size={14} fill="currentColor"/> Education, Evolved.</div>
          </div>
        </div>
        <footer className="developer-note-footer"><span>A little progress, every day.</span><button onClick={onClose}>Let’s get started <ArrowRight size={15}/></button></footer>
      </article>
    </div>
  );
}
