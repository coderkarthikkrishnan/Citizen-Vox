/**
 * CivicPulse AI Analysis Worker
 * 
 * Secure backend layer to interface with Gemini API.
 */

import { updateClusterConfidence } from './community/aggregates.js';
import { handleAnalyzePriority } from './priority/analyzePriority.js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const pathname = new URL(request.url).pathname;

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    try {
      if (pathname === "/api/analyze-issue") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
        return await handleAnalyzeIssue(request, env);
      } else if (pathname === "/api/check-duplicates") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
        return await handleCheckDuplicates(request, env);
      } else if (pathname === "/api/community/recalculate") {
        return await handleRecalculateConfidence(request, env);
      } else if (pathname === "/api/analyze-priority") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
        return await handleAnalyzePriority(request, env);
      } else if (pathname === "/api/analyze-intelligence") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
        return await handleAnalyzeIntelligence(request, env);
      } else if (pathname === "/api/copilot") {
        if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
        return await handleCopilot(request, env);
      } else {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error("Worker Error:", error.message);
      return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

async function handleRecalculateConfidence(request, env) {
  const body = await request.json();
  const { clusterId } = body;
  
  if (!clusterId) {
    return new Response(JSON.stringify({ error: "Missing clusterId" }), { status: 400, headers: corsHeaders });
  }

  // Extract auth token to perform update on user's behalf
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "") : null;

  try {
    const result = await updateClusterConfidence(env, clusterId, token);
    return new Response(JSON.stringify({ success: true, confidence: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    throw new Error("Confidence recalculation failed: " + err.message);
  }
}

async function handleAnalyzeIssue(request, env) {
  const body = await request.json();
  const { issueId, description, category, media, latitude, longitude } = body;

  if (!description && !category) {
    return new Response(JSON.stringify({ error: "Missing description or category" }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const systemPrompt = `You are the "CivicPulse Civic Issue Analyst". Your job is to analyze civic issue reports.
Analyze the provided description, user-selected category, and any image evidence descriptions to classify the issue.
IMPORTANT RULES:
- Do not invent facts.
- If image evidence is unclear, lower your confidence.
- Identify if the description conflicts with the user-selected category.
- Output strictly in JSON format.
- Output MUST use these exact keys: "category", "issueType", "severity", "recommendedDepartment", "summary", "reasoning", "confidence", "language", "extractedLocation", "impact".
- "category" must be one of: "pothole", "road_damage", "garbage", "water_leakage", "drainage", "streetlight", "fallen_tree", "public_safety", "other".
- "issueType" is a slightly more descriptive label than category (e.g. "Deep Pothole", "Broken Water Main").
- "severity" must be one of: "critical", "high", "medium", "low".
- "recommendedDepartment" must be one of: "roads", "sanitation", "water", "drainage", "electrical", "environment", "public_safety", "general".
- "confidence" must be a float between 0.0 and 1.0.
- "summary" must be 1-2 concise sentences.
- "reasoning" must be an array of short strings (bullet points) explaining the severity and category.
- "language" should be the detected language code (e.g. "en", "es").
- "extractedLocation" should be any location entities mentioned in the text, or null.
- "impact" should be a 1-sentence description of the potential community impact.
`;

  let userPrompt = `User Selected Category: ${category}\nDescription: ${description}\n`;
  const parts = [{ text: systemPrompt }, { text: userPrompt }];

  if (media && media.length > 0) {
     parts.push({ text: `Note: User provided ${media.length} image(s). (Assume visual evidence corroborates the description unless otherwise noted).` });
  }

  const geminiPayload = {
    contents: [{ role: "user", parts: parts }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with AI provider.");
  }

  const data = await response.json();
  const candidateContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!candidateContent) throw new Error("Invalid response structure from AI.");

  let aiResult;
  try {
    aiResult = JSON.parse(candidateContent);
  } catch (e) {
    throw new Error("AI returned malformed JSON.");
  }

  const normalizedResult = {
    category: aiResult.category || "other",
    issueType: aiResult.issueType || "Unknown Issue",
    severity: aiResult.severity || "low",
    recommendedDepartment: aiResult.recommendedDepartment || "general",
    summary: aiResult.summary || "AI analysis completed.",
    reasoning: Array.isArray(aiResult.reasoning) ? aiResult.reasoning : ["Analysis based on user report."],
    confidence: typeof aiResult.confidence === 'number' ? aiResult.confidence : 0.5,
    language: aiResult.language || "unknown",
    extractedLocation: aiResult.extractedLocation || null,
    impact: aiResult.impact || "Unknown impact.",
    analyzedAt: new Date().toISOString(),
    model: "gemini-1.5-flash"
  };

  return new Response(JSON.stringify({ success: true, aiAnalysis: normalizedResult }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleCheckDuplicates(request, env) {
  const body = await request.json();
  const { newReport, candidates } = body;

  if (!newReport || !candidates || !Array.isArray(candidates)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ success: true, result: { potentialMatch: false } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const systemPrompt = `You are the CivicPulse Duplicate Detection Engine. 
You are given a NEW citizen report and a list of CANDIDATE reports that occurred nearby.
Your job is to determine if the new report describes the EXACT SAME physical real-world problem as one of the candidates.

RULES:
- A pothole 50m away from another pothole MIGHT be the same, but if descriptions differ (e.g., "near gate" vs "near crosswalk"), they are different.
- Do not claim they are the same purely because they have the same category.
- Output MUST be valid JSON.
- Output MUST use these exact keys: "potentialMatch" (boolean), "matchScore" (float 0.0 to 1.0), "matchedCandidateId" (string or null), "reasoning" (array of short string bullet points).
- If potentialMatch is false, matchScore should be low (e.g. < 0.5) and matchedCandidateId should be null.
- If potentialMatch is true, matchedCandidateId MUST be the ID of the candidate that matches best.
`;

  let userPrompt = `NEW REPORT:\nTitle: ${newReport.title}\nCategory: ${newReport.category}\nDesc: ${newReport.description}\n\nCANDIDATES:\n`;
  candidates.forEach((c, i) => {
    userPrompt += `[Candidate ${i+1}]\nID: ${c.id}\nTitle: ${c.title}\nCategory: ${c.category}\nDesc: ${c.description}\nDistance: ${c.distanceStr}\n\n`;
  });

  const geminiPayload = {
    contents: [{ role: "user", parts: [{ text: systemPrompt }, { text: userPrompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with AI provider.");
  }

  const data = await response.json();
  const candidateContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!candidateContent) throw new Error("Invalid response structure from AI.");

  let aiResult;
  try {
    aiResult = JSON.parse(candidateContent);
  } catch (e) {
    throw new Error("AI returned malformed JSON.");
  }

  return new Response(JSON.stringify({ success: true, result: aiResult }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleAnalyzeIntelligence(request, env) {
  const body = await request.json();
  const { metrics } = body;

  if (!metrics) {
    return new Response(JSON.stringify({ error: "Missing intelligence metrics" }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const systemPrompt = `You are the CivicPulse Intelligence Analyst.
You will be provided with computed metrics and trends representing civic issues in a region over a time period.
Your task is to summarize these facts for a city authority dashboard.

IMPORTANT RULES:
- DO NOT invent facts, numbers, causes, or locations. Only use the data provided.
- If data is sparse or zero, simply state there is insufficient data or no recent activity.
- Output MUST be valid JSON.
- Output MUST use these exact keys: "summary" (string, 2-3 sentences), "observations" (array of short string bullet points, max 3), "limitations" (array of short string bullet points, max 2).
- Example limitation: "Cannot determine the underlying cause of road damage from available data."
`;

  let userPrompt = `COMPUTED METRICS:\n${JSON.stringify(metrics, null, 2)}`;

  const geminiPayload = {
    contents: [{ role: "user", parts: [{ text: systemPrompt }, { text: userPrompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with AI provider.");
  }

  const data = await response.json();
  const candidateContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!candidateContent) throw new Error("Invalid response structure from AI.");

  let aiResult;
  try {
    aiResult = JSON.parse(candidateContent);
  } catch (e) {
    throw new Error("AI returned malformed JSON.");
  }

  return new Response(JSON.stringify({ success: true, insight: aiResult }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleCopilot(request, env) {
  const body = await request.json();
  const { question, contextData, role } = body;

  if (!question || !contextData) {
    return new Response(JSON.stringify({ error: "Missing question or contextData" }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const systemPrompt = `You are Civic Copilot, an AI assistant for a CivicPulse ${role}.
Your job is to answer questions about civic operations strictly using the provided context data.

IMPORTANT RULES:
- DO NOT invent facts, numbers, or issues.
- ONLY answer based on the provided context data.
- If the context data does not contain the answer, say "I don't have enough data to answer that."
- Format your response in clean Markdown.
- Be concise and actionable.
`;

  let userPrompt = `CONTEXT DATA:\n${JSON.stringify(contextData, null, 2)}\n\nQUESTION:\n${question}`;

  const geminiPayload = {
    contents: [{ role: "user", parts: [{ text: systemPrompt }, { text: userPrompt }] }]
  };

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload)
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with AI provider.");
  }

  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to process the data.";

  return new Response(JSON.stringify({ success: true, answer }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}


