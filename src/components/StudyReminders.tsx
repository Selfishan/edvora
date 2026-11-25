import { useEffect, useState } from 'react';
import { BellRing, Check, Clock3 } from 'lucide-react';
import './focus-round-dial.css';

const keyFor = (id: string) => `edvora-reminders:${id}`;
type ReminderSettings = { enabled: boolean; time: string; lastDate?: string };
const readSettings = (userId: string): ReminderSettings => {
  try {
    const value = localStorage.getItem(keyFor(userId));
    if (value) return { enabled: false, time: '18:00', ...JSON.parse(value) as ReminderSettings };
  } catch { /* keep the default reminder preferences */ }
  return { enabled: false, time: '18:00' };
};

export function StudyReminderRuntime({ userId }: { userId: string }) {
  useEffect(() => {
    if (!('Notification' in window)) return;
    const pending = localStorage.getItem('edvora-reminders-pending') === 'true';
    if (pending) {
      const settings = readSettings(userId);
      localStorage.setItem(keyFor(userId), JSON.stringify({ ...settings, enabled: Notification.permission === 'granted' }));
      localStorage.removeItem('edvora-reminders-pending');
    }
    const check = () => {
      const settings = readSettings(userId);
      if (!settings.enabled || Notification.permission !== 'granted') return;
      const now = new Date();
      const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const [hour, minute] = settings.time.split(':').map(Number);
      if (currentMinute < hour * 60 + minute || settings.lastDate === date) return;
      const quotes = [
        'Small steps count. Give your goal a little attention today.',
        'You do not need a perfect plan—just one focused next step.',
        'A little practice today can make tomorrow feel easier.',
        'Pause, refresh your study routine, and choose one thing to begin.',
        'Your future self will be glad you showed up for a few minutes.',
      ];
      const quote = quotes[now.getDate() % quotes.length];
      const notification = new Notification('A gentle EDVORA nudge', { body: `${quote} Open your planner and pick your next study step.`, icon: '/favicon.ico', tag: `edvora-study-${date}` });
      notification.onclick = () => { window.focus(); notification.close(); };
      localStorage.setItem(keyFor(userId), JSON.stringify({ ...settings, lastDate: date }));
    };
    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [userId]);
  return null;
}

export function StudyReminderSettings({ userId }: { userId: string }) {
  const [settings, setSettings] = useState<ReminderSettings>(() => readSettings(userId));
  const [permission, setPermission] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [status, setStatus] = useState('');
  const save = (next: ReminderSettings) => { setSettings(next); localStorage.setItem(keyFor(userId), JSON.stringify(next)); };
  const enable = async () => {
    if (!('Notification' in window)) { setStatus('This browser does not support system notifications.'); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') { save({ ...settings, enabled: true }); setStatus('Daily study reminders are on.'); }
    else setStatus('Notifications were not enabled. You can change this in your browser settings.');
  };
  return <section className="reminder-settings"><div className="reminder-heading"><span><BellRing size={17}/></span><div><b>Gentle study reminders</b><small>Motivational note and a prompt to refresh your study plan.</small></div></div><div className="reminder-controls"><label><Clock3 size={14}/> Remind me around <input type="time" value={settings.time} onChange={event=>save({ ...settings, time: event.target.value })}/></label>{settings.enabled&&permission==='granted'?<button className="reminder-on" onClick={()=>{save({...settings,enabled:false});setStatus('Daily reminders are paused.')}}><Check size={14}/> Enabled</button>:<button onClick={()=>void enable()}><BellRing size={14}/> Enable notifications</button>}</div><small className="reminder-disclaimer">Requires notification permission. Reminders run while EDVORA is open in this browser; browser support varies on phones.</small>{status&&<span className="reminder-status" role="status">{status}</span>}</section>;
}
