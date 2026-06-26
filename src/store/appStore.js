import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set, get) => ({
      // User profile
      profile: null,
      skills: [],
      selectedRole: null, // 'candidate' | 'employer'
      profileLoading: false,
      profileFetched: false,

      setProfile: (profile) => set({ profile }),
      setSkills: (skills) => set({ skills }),
      setSelectedRole: (role) => set({ selectedRole: role }),
      setProfileLoading: (profileLoading) => set({ profileLoading }),
      setProfileFetched: (profileFetched) => set({ profileFetched }),

      addSkills: (newSkills) => {
        const current = get().skills;
        const currentNames = current.map(s => 
          typeof s === 'string' ? s.toLowerCase() : s.skill_name?.toLowerCase()
        );
        const toAdd = newSkills.filter(s => {
          const name = typeof s === 'string' ? s.toLowerCase() : s.skill_name?.toLowerCase();
          return !currentNames.includes(name);
        });
        set({ skills: [...current, ...toAdd] });
      },

      removeSkill: (skillName) => {
        const current = get().skills;
        set({
          skills: current.filter(s => {
            const name = typeof s === 'string' ? s : s.skill_name;
            return name !== skillName;
          }),
        });
      },

      clearProfile: () => set({
        profile: null,
        skills: [],
        selectedRole: null,
        profileLoading: false,
        profileFetched: false,
      }),
    }),
    {
      name: 'jobmatch-store',
      partialize: (state) => ({
        selectedRole: state.selectedRole,
      }),
    }
  )
);
