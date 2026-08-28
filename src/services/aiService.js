import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

const WORKER_BASE = import.meta.env.VITE_WORKER_URL || 'http://127.0.0.1:8787';

export const aiService = {
  /**
   * Send issue data to the Cloudflare worker for AI classification and extraction
   */
  analyzeIssue: async (issueId, issueData) => {
    try {
      const response = await fetch(`${WORKER_BASE}/api/analyze-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueId,
          description: issueData.description,
          category: issueData.category,
          media: issueData.media || [],
          latitude: issueData.location?.lat || null,
          longitude: issueData.location?.lng || null
        })
      });

      if (!response.ok) throw new Error('AI analysis backend failed.');
      const data = await response.json();
      if (!data.success || !data.aiAnalysis) throw new Error('Invalid response from AI backend.');
      
      return data.aiAnalysis;
    } catch (error) {
      console.error("AI Service Error (analyzeIssue):", error);
      throw error;
    }
  },

  /**
   * Send new report and candidates to the worker for duplicate detection
   */
  checkDuplicates: async (newReport, candidates) => {
    try {
      const response = await fetch(`${WORKER_BASE}/api/check-duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newReport, candidates })
      });

      if (!response.ok) throw new Error('AI duplicate check failed.');
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error("AI Service Error (checkDuplicates):", error);
      return { potentialMatch: false };
    }
  },

  /**
   * Ask Civic Copilot a question based on provided context.
   * Calls Gemini API directly — no Cloudflare Worker dependency for copilot.
   */
  askCopilot: async (question, contextData, role = 'Admin') => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is missing from .env');
    }

    const systemPrompt = `You are Citizen Vox AI, an intelligent civic governance assistant. 
You help ${role}s analyze civic issues, understand trends, and make data-driven decisions.
Always be concise, factual, and actionable. Base your answers on the provided context data.`;

    const prompt = `Context Data:\n${JSON.stringify(contextData, null, 2)}\n\nQuestion: ${question}`;

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
    };

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Gemini API error ${res.status}: ${errBody?.error?.message || res.statusText}`);
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text
        || 'I was unable to generate a response. Please try again.';
    } catch (error) {
      console.error('Copilot Error:', error);
      throw error;
    }
  }
};
