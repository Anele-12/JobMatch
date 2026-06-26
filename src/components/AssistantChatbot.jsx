import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import { useProfile } from '../hooks/useProfile';
import { Spinner } from './ui/index';

const STARTERS = {
  candidate: [
    'How can I improve my job matches?',
    'Help me prepare for an interview.',
    'Draft a short follow-up message.',
  ],
  employer: [
    'How should I compare these applicants?',
    'Draft an interview invite.',
    'What should my next hiring step be?',
  ],
};

function formatMessage(content) {
  return String(content || '')
    .replace(/\s+(?=\d+\.\s)/g, '\n')
    .replace(/\s+(?=-\s)/g, '\n')
    .replace(/\*\*/g, '')
    .trim();
}

export default function AssistantChatbot() {
  const { profile, role, skillNames, profileFetched } = useProfile();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: role === 'employer'
        ? 'Hi, I can help screen applicants, draft messages, and plan next steps.'
        : 'Hi, I can help with job matches, applications, and interview prep.',
    },
  ]);

  const starters = STARTERS[role] || STARTERS.candidate;
  const canChat = profileFetched && profile?.profile_completed && (role === 'candidate' || role === 'employer');

  useEffect(() => {
    if (!role) return;
    setMessages([
      {
        role: 'assistant',
        content: role === 'employer'
          ? 'Hi, I can help screen applicants, draft messages, and plan next steps.'
          : 'Hi, I can help with job matches, applications, and interview prep.',
      },
    ]);
  }, [role]);

  const context = useMemo(() => ({
    name: profile?.full_name,
    company_name: profile?.company_name,
    headline: profile?.headline,
    skills: skillNames || [],
    current_page: location.pathname,
  }), [profile, skillNames, location.pathname]);

  if (!canChat) return null;

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/api/chat', {
        role,
        message: trimmed,
        context,
        history: messages.slice(-6),
      });
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      toast.error(err.message || 'Assistant unavailable');
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: 'I could not answer right now. Please try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-dark-600 bg-dark-800 shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold-500/15 border border-gold-500/20 flex items-center justify-center">
                <Bot size={16} className="text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dark-100">JobMatch Assistant</p>
                <p className="text-xs text-dark-500 capitalize">{role} support</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 text-dark-400 hover:text-dark-100 rounded-lg hover:bg-dark-700">
              <X size={16} />
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'ml-8 bg-gold-500/15 text-gold-100 border border-gold-500/20'
                    : 'mr-8 bg-dark-700 text-dark-200 border border-dark-600'
                }`}
              >
                {formatMessage(message.content)}
              </div>
            ))}
            {loading && (
              <div className="mr-8 bg-dark-700 text-dark-300 border border-dark-600 rounded-lg px-3 py-2 inline-flex items-center gap-2 text-sm">
                <Spinner size={14} />
                Thinking
              </div>
            )}
          </div>

          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {starters.map(starter => (
              <button
                key={starter}
                onClick={() => sendMessage(starter)}
                disabled={loading}
                className="text-xs px-2.5 py-1.5 rounded-full border border-dark-600 text-dark-300 hover:text-gold-300 hover:border-gold-500/30 disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
            className="border-t border-dark-700 p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="input-field py-2"
              placeholder="Ask for help..."
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3 py-2 disabled:opacity-50">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-gold-500 text-dark-900 shadow-gold-lg flex items-center justify-center hover:bg-gold-400 active:scale-95 transition-all"
        aria-label="Open JobMatch assistant"
      >
        {open ? <X size={20} /> : <MessageCircle size={21} />}
      </button>
    </div>
  );
}
