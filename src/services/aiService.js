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
   * Ask Civic Copilot a question based on provided context
   */
  askCopilot: async (question, contextData, role = 'Admin') => {
    try {
      const response = await fetch(`${WORKER_BASE}/api/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, contextData, role })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Copilot backend failed: ${errText}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Copilot failed.');

      return data.answer;
    } catch (error) {
      console.warn("Cloudflare Worker failed. Falling back to direct Gemini API call...", error);
      
      // FALLBACK TO DIRECT REST API
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Worker failed and VITE_GEMINI_API_KEY is missing for fallback.');
      }

      const systemPrompt = "You are CivicPulse AI Assistant. Help admins and citizens query ticket statuses, ward analytics, and civic issue resolution workflows.";
      const prompt = `Context: ${JSON.stringify(contextData)}\n\nQuestion: ${question}`;
      
      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      };

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Direct Gemini API call failed.');
        const geminiData = await res.json();
        
        return geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I am currently unable to answer that question.";
      } catch (fallbackError) {
        console.error("Copilot Fallback Error:", fallbackError);
        throw fallbackError;
      }
    }
  }
};
