import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  context?: any;
}

const SUGGESTION_KEYS = [
  'chat.suggestion1',
  'chat.suggestion2',
  'chat.suggestion3',
  'chat.suggestion4',
];

export function ChatInterface({ isOpen, onClose, context }: ChatInterfaceProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'chat.greeting',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Create a temporary loading message for the assistant
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, role: 'assistant', content: '...', timestamp: new Date() };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: context?.field?.id || 'field-1',
          message: input,
          context: context,
          language: i18n.language
        })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, content: data.reply || data.response || t('chat.aiError') }
          : msg
      ));
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? { ...msg, content: t('chat.connError') }
          : msg
      ));
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Dynamic Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`px-4 py-3 rounded-2xl text-[13px] font-medium leading-relaxed ${msg.role === 'user' ? 'bg-[#1d1d1f] text-white shadow-lg' : 'bg-[#f5f5f7] text-[#1d1d1f]'}`}>
                {t(msg.content)}
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#86868b] mt-2 px-11 uppercase tracking-widest">
              {msg.timestamp.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Input Terminal */}
      <div className="p-6 border-t border-black/5 bg-white space-y-4">
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_KEYS.map(s => (
            <button key={s} onClick={() => setInput(t(s))}
              className="text-[10px] font-bold px-3 py-1.5 bg-[#f5f5f7] hover:bg-black hover:text-white rounded-full transition-all border border-black/5"
            >{t(s)}</button>
          ))}
        </div>

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b] group-focus-within:text-blue-500 transition-colors">
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chat.placeholder')}
            className="w-full h-12 pl-4 pr-28 bg-[#f5f5f7] border border-transparent rounded-xl text-[13px] font-medium focus:bg-white focus:border-blue-500/30 transition-all outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-2 h-8 px-3 bg-[#1d1d1f] text-white rounded-lg text-[12px] font-semibold hover:bg-black disabled:opacity-30"
          >
            {t('chat.send')}
          </button>
        </div>
        <p className="text-[9px] text-center font-bold text-[#86868b] uppercase tracking-widest">{t('chat.hint')}</p>
      </div>
    </div>
  );
}