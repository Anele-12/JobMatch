import { useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import api from '../lib/api';
import { useAppStore } from '../store/appStore';

export function useProfile() {
  const { user, isLoaded } = useUser();
  const {
    profile,
    setProfile,
    skills,
    setSkills,
    selectedRole,
    profileLoading,
    profileFetched,
    setProfileLoading,
    setProfileFetched,
  } = useAppStore();

  const fetchProfile = useCallback(async (force = false) => {
    if (!user?.id || profileLoading) return;
    if (!force && profileFetched) return;

    setProfileLoading(true);
    try {
      const data = await api.get(`/api/profile/${user.id}`);
      if (data?.exists === false) {
        setProfile(null);
        setSkills([]);
      } else {
        setProfile(data);
        if (data.skills) setSkills(data.skills);
      }
    } catch {
      setProfile(null);
      setSkills([]);
    } finally {
      setProfileFetched(true);
      setProfileLoading(false);
    }
  }, [
    user?.id,
    profileFetched,
    profileLoading,
    setProfile,
    setSkills,
    setProfileLoading,
    setProfileFetched,
  ]);

  const saveProfile = useCallback(async (profileData) => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const result = await api.post('/api/profile', {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        ...profileData,
      });
      setProfile(result.profile);
      setProfileFetched(true);
      return result.profile;
    } finally {
      setProfileLoading(false);
    }
  }, [user, setProfile, setProfileLoading, setProfileFetched]);

  const saveSkills = useCallback(async (skillsList, source = 'manual') => {
    if (!user?.id) return;
    const result = await api.post('/api/profile/skills/update', {
      candidate_id: user.id,
      skills: skillsList.map(s => typeof s === 'string' ? s : s.skill_name),
      source,
    });
    setSkills(result.skills);
    return result.skills;
  }, [user?.id, setSkills]);

  useEffect(() => {
    if (isLoaded && user?.id && !profileFetched && !profileLoading) {
      fetchProfile();
    }
  }, [isLoaded, user?.id, profileFetched, profileLoading, fetchProfile]);

  const skillNames = skills.map(s => typeof s === 'string' ? s : s.skill_name);

  return {
    profile,
    skills,
    skillNames,
    loading: profileLoading,
    profileFetched,
    fetchProfile,
    saveProfile,
    saveSkills,
    isProfileComplete: profile?.profile_completed,
    role: profile?.role || selectedRole,
  };
}
