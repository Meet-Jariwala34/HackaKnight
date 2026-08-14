const axios = require('axios');
const db = require('../config/db');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ Candidate connected to interview room: ${socket.id}`);

    // Event 1: Start/Join an Interview Session
    socket.on('join_interview', async (data) => {
      const { candidateId, jobId } = data;
      console.log(`Candidate ${candidateId} started interview for Job ${jobId}`);

      try {
        // Create an active session in Postgres
        const result = await db.query(
          `INSERT INTO interview_sessions (candidate_id, job_id, status, chat_transcript)
           VALUES ($1, $2, 'IN_PROGRESS', $3)
           RETURNING id;`,
          [candidateId || 1, jobId || 1, JSON.stringify([])]
        );

        const sessionId = result.rows[0].id;
        socket.emit('session_created', { sessionId });
      } catch (err) {
        console.error('Error starting interview session:', err.message);
        socket.emit('session_error', { message: 'Could not create interview session.' });
      }
    });

    // Event 2: Candidate Submits Answer (Text or Audio Transcript)
    socket.on('submit_answer', async (data) => {
      try {
        const { sessionId, userAnswer, currentQuestionId, questionText } = data;
        console.log(`📩 Received Answer for Q${currentQuestionId}: "${userAnswer}"`);

        // Forward answer payload to Harsh & Nitya's Python AI microservice
        let aiEvaluation;
        try {
          const aiResponse = await axios.post(`${process.env.PYTHON_AI_URL}/process-answer`, {
            sessionId,
            userAnswer,
            currentQuestionId,
            questionText
          });
          aiEvaluation = aiResponse.data;
        } catch (apiError) {
          console.warn('⚠️ Python AI service unreachable, using mock fallback response.');
          // Fallback response in case Python service is not running yet during testing
          aiEvaluation = {
            score: 8,
            feedback: 'Good overview of the topic! Consider mentioning lifecycle management.',
            modelAnswer: 'A complete answer would include React hooks and Context API for global state.',
            nextQuestion: 'Can you explain how middleware works in Express.js?',
            audioUrl: null
          };
        }

        // Update Chat Transcript in Postgres
        const transcriptUpdate = {
          questionId: currentQuestionId,
          question: questionText,
          candidateAnswer: userAnswer,
          aiFeedback: aiEvaluation.feedback,
          modelAnswer: aiEvaluation.modelAnswer,
          score: aiEvaluation.score
        };

        await db.query(
          `UPDATE interview_sessions 
           SET chat_transcript = jsonb_insert(
             COALESCE(chat_transcript, '[]'::jsonb),
             '{0}',
             $1::jsonb
           )
           WHERE id = $2;`,
          [JSON.stringify(transcriptUpdate), sessionId]
        );

        // Emit instant reply back to the React UI
        socket.emit('ai_reply', {
          feedback: aiEvaluation.feedback,
          modelAnswer: aiEvaluation.modelAnswer,
          nextQuestion: aiEvaluation.nextQuestion,
          audioUrl: aiEvaluation.audioUrl,
          score: aiEvaluation.score
        });

      } catch (error) {
        console.error('Socket processing error:', error.message);
        socket.emit('ai_error', { message: 'Error evaluating candidate answer.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Candidate disconnected: ${socket.id}`);
    });
  });
};