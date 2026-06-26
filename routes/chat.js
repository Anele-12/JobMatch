import express from 'express';
import { validate } from '../middleware/validate.js';
import { chatAssistantSchema } from '../schemas/index.js';
import { generateAssistantReply } from '../services/groqService.js';

const router = express.Router();

router.post('/', validate(chatAssistantSchema), async (req, res) => {
  try {
    const reply = await generateAssistantReply(req.body);
    res.json({ reply });
  } catch (err) {
    console.error('[Chat]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
