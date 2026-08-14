const axios = require('axios');
const FormData = require('form-data');
const db = require('../config/db');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF resume uploaded' });
    }

    const { targetJobId, candidateName, candidateEmail } = req.body;

    // Prepare multipart form payload for Python AI Microservice
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append('targetJobId', targetJobId || '');

    // Send payload to Harsh & Nitya's FastAPI engine
    const aiResponse = await axios.post(
      `${process.env.PYTHON_AI_URL}/extract-resume`,
      formData,
      { headers: formData.getHeaders() }
    );

    const { extractedSkills, atsScore, matchedSkills, missingSkills, suggestions } = aiResponse.data;

    // Upsert Candidate Record in Postgres
    const candidateQuery = `
      INSERT INTO candidates (name, email, parsed_skills)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) 
      DO UPDATE SET parsed_skills = EXCLUDED.parsed_skills
      RETURNING id;
    `;
    const candidateResult = await db.query(candidateQuery, [
      candidateName || 'Candidate',
      candidateEmail || 'candidate@example.com',
      JSON.stringify(extractedSkills),
    ]);
    const candidateId = candidateResult.rows[0].id;

    // Save Resume Analysis Record
    const analysisQuery = `
      INSERT INTO resume_analyses (candidate_id, job_id, ats_score, matched_skills, missing_skills, improvement_suggestions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;
    await db.query(analysisQuery, [
      candidateId,
      targetJobId || 1,
      atsScore,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
      JSON.stringify(suggestions),
    ]);

    res.status(200).json({
      message: 'Resume parsed and saved successfully',
      data: {
        candidateId,
        atsScore,
        extractedSkills,
        matchedSkills,
        missingSkills,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Upload handling error:', error.message);
    res.status(500).json({ error: 'Failed to process resume upload' });
  }
};