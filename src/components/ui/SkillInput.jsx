import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { SkillTag } from './index';

export default function SkillInput({ skills = [], onChange, placeholder = 'Add a skill...' }) {
  const [input, setInput] = useState('');

  const addSkill = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    const normalizedSkills = skills.map(s => 
      typeof s === 'string' ? s.toLowerCase() : s.skill_name?.toLowerCase()
    );
    
    if (!normalizedSkills.includes(trimmed.toLowerCase())) {
      onChange([...skills, trimmed]);
    }
    setInput('');
  };

  const removeSkill = (skillName) => {
    onChange(skills.filter(s => {
      const name = typeof s === 'string' ? s : s.skill_name;
      return name !== skillName;
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    }
    if (e.key === 'Backspace' && !input && skills.length > 0) {
      const last = skills[skills.length - 1];
      removeSkill(typeof last === 'string' ? last : last.skill_name);
    }
  };

  return (
    <div className="w-full">
      <div className="min-h-[48px] bg-dark-700 border border-dark-500 rounded-lg p-2 flex flex-wrap gap-1.5 focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500/20 transition-all">
        {skills.map((skill, i) => (
          <SkillTag key={i} skill={skill} onRemove={removeSkill} />
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addSkill(input)}
            placeholder={skills.length === 0 ? placeholder : 'Add more...'}
            className="flex-1 bg-transparent text-sm text-dark-100 placeholder-dark-500 outline-none"
          />
          {input && (
            <button
              onClick={() => addSkill(input)}
              className="text-gold-500 hover:text-gold-400 p-0.5"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-dark-500 mt-1">Press Enter or comma to add a skill</p>
    </div>
  );
}
