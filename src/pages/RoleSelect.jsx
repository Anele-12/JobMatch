import { useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import { Briefcase, Building2, CheckCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import Navbar from '../components/layout/Navbar';

const candidatePerks = [
  'AI CV analysis & skill extraction',
  'Instant qualification screening',
  'Live job feed from RemoteOK',
  'Track all your applications',
];

const employerPerks = [
  'Post jobs and reach top talent',
  'AI-ranked applicants by fit score',
  'See skill match percentages',
  'Manage hiring pipeline easily',
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { setSelectedRole } = useAppStore();

  const handleSelect = (role) => {
    setSelectedRole(role);
    navigate(`/sign-up?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      <Navbar />

      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-dark-50 mb-3">
            How are you using <span className="text-gold-400">JobMatch AI</span>?
          </h1>
          <p className="text-dark-300">Choose your role to get started with a personalized experience</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Job Seeker */}
          <button
            onClick={() => handleSelect('candidate')}
            className="card border-2 border-dark-600 hover:border-gold-500/60 hover:shadow-gold p-8 text-left transition-all duration-300 group"
          >
            <div className="w-14 h-14 bg-gold-500/15 group-hover:bg-gold-500/25 rounded-2xl flex items-center justify-center mb-5 transition-colors">
              <Briefcase size={26} className="text-gold-400" />
            </div>
            <h2 className="text-xl font-display font-bold text-dark-50 mb-2 group-hover:text-gold-300 transition-colors">
              I'm Looking for Work
            </h2>
            <p className="text-dark-400 text-sm mb-5">
              Upload your CV, get AI feedback, and find roles that match your skills perfectly.
            </p>
            <ul className="space-y-2">
              {candidatePerks.map(perk => (
                <li key={perk} className="flex items-center gap-2 text-sm text-dark-300">
                  <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 text-gold-400 text-sm font-medium group-hover:gap-3 transition-all">
              Continue as Job Seeker <ArrowRight size={15} />
            </div>
          </button>

          {/* Employer */}
          <button
            onClick={() => handleSelect('employer')}
            className="card border-2 border-dark-600 hover:border-blue-500/60 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] p-8 text-left transition-all duration-300 group"
          >
            <div className="w-14 h-14 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-5 transition-colors">
              <Building2 size={26} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-display font-bold text-dark-50 mb-2 group-hover:text-blue-300 transition-colors">
              I'm Hiring Talent
            </h2>
            <p className="text-dark-400 text-sm mb-5">
              Post jobs, review AI-ranked applicants, and build your team with confidence.
            </p>
            <ul className="space-y-2">
              {employerPerks.map(perk => (
                <li key={perk} className="flex items-center gap-2 text-sm text-dark-300">
                  <CheckCircle size={13} className="text-blue-400 flex-shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
              Continue as Employer <ArrowRight size={15} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
