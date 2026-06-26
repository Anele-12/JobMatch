import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import supabase from '../lib/supabase.js';
import { extractSkillsFromCV } from '../services/groqService.js';
import { calculateProfileCompletion, withSignedProfileAssets } from '../lib/profileUtils.js';

const router = express.Router();

// Memory storage (process in-memory, don't save to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// POST /api/cv/upload
router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { candidate_id } = req.body;
    if (!candidate_id) {
      return res.status(400).json({ error: 'candidate_id required' });
    }

    // Extract text from PDF
    let pdfText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      pdfText = pdfData.text;
    } catch (pdfErr) {
      return res.status(400).json({ error: 'Could not parse PDF file. Please ensure it is a valid PDF.' });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(400).json({ error: 'PDF appears to be empty or scanned image (not readable text).' });
    }

    // Use Groq to extract skills
    const aiResult = await extractSkillsFromCV(pdfText);
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cvPath = `${candidate_id}/cv-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('candidate-documents')
      .upload(cvPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });
    
    // Save extracted skills to database
    if (aiResult.skills && aiResult.skills.length > 0) {
      const skillRecords = aiResult.skills.map(skill => ({
        candidate_id,
        skill_name: skill.trim(),
        source: 'ai',
      }));

      await supabase
        .from('candidate_skills')
        .upsert(skillRecords, { onConflict: 'candidate_id,skill_name', ignoreDuplicates: true });
    }

    // Fetch all current skills
    const { data: allSkills } = await supabase
      .from('candidate_skills')
      .select('skill_name, source')
      .eq('candidate_id', candidate_id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', candidate_id)
      .maybeSingle();

    const existingExperience = Number(profile?.experience_years) || 0;
    const nextExperience = aiResult.experience_years > existingExperience
      ? aiResult.experience_years
      : existingExperience;
    const nextProfile = {
      ...(profile || {}),
      cv_file_path: cvPath,
      cv_file_name: req.file.originalname,
      cv_uploaded_at: new Date().toISOString(),
      education: aiResult.education?.length ? aiResult.education : profile?.education || [],
      experience_years: nextExperience,
    };
    const profile_completion = calculateProfileCompletion(nextProfile, allSkills || []);

    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update({
        cv_file_path: cvPath,
        cv_file_name: req.file.originalname,
        cv_uploaded_at: nextProfile.cv_uploaded_at,
        education: nextProfile.education,
        experience_years: nextExperience,
        profile_completion,
      })
      .eq('id', candidate_id)
      .select()
      .maybeSingle();

    res.json({
      success: true,
      extracted: aiResult,
      all_skills: allSkills || [],
      profile: await withSignedProfileAssets(updatedProfile),
      message: `Successfully extracted ${aiResult.skills?.length || 0} skills from your CV.`,
    });
  } catch (err) {
    console.error('[CV Upload]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
