var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-KTBBE3/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// community/confidence.js
function calculateConfidence(data) {
  const {
    reportCount = 0,
    confirmationCount = 0,
    evidenceCount = 0,
    flagCount = 0
  } = data;
  let score = 0;
  const factors = [];
  let reportScore = 0;
  if (reportCount === 1) reportScore = 15;
  else if (reportCount === 2) reportScore = 25;
  else if (reportCount >= 3) reportScore = 35;
  if (reportCount > 0) {
    score += reportScore;
    factors.push(`${reportCount} independent reports`);
  }
  let confirmScore = 0;
  if (confirmationCount > 0) {
    if (confirmationCount < 3) confirmScore = 10;
    else if (confirmationCount < 5) confirmScore = 20;
    else if (confirmationCount < 10) confirmScore = 28;
    else confirmScore = 35;
    score += confirmScore;
    factors.push(`${confirmationCount} community confirmations`);
  }
  let evScore = 0;
  if (evidenceCount > 0) {
    if (evidenceCount < 3) evScore = 15;
    else evScore = 25;
    score += evScore;
    factors.push(`${evidenceCount} evidence photos`);
  }
  if (reportCount > 1 || confirmationCount > 0) {
    score += 5;
    factors.push("High location consistency");
  }
  if (flagCount > 0) {
    const penalty = Math.min(flagCount * 10, 30);
    score -= penalty;
    factors.push(`${flagCount} negative flags reported`);
  }
  score = Math.max(0, Math.min(100, score));
  let level = "Low Evidence";
  if (score >= 85) level = "Very Strong Evidence";
  else if (score >= 70) level = "Strong Evidence";
  else if (score >= 40) level = "Developing Evidence";
  return {
    score,
    level,
    factors
  };
}
__name(calculateConfidence, "calculateConfidence");

// community/aggregates.js
async function fetchFirestoreDoc(projectId, collection, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  return await response.json();
}
__name(fetchFirestoreDoc, "fetchFirestoreDoc");
async function updateClusterConfidence(env, clusterId, token) {
  const projectId = env.FIREBASE_PROJECT_ID || "citizenvox-91c1a";
  const clusterDoc = await fetchFirestoreDoc(projectId, "issueClusters", clusterId);
  if (!clusterDoc) throw new Error("Cluster not found");
  const fields = clusterDoc.fields || {};
  const currentReportCount = fields.reportCount?.integerValue ? parseInt(fields.reportCount.integerValue, 10) : 0;
  const currentConfirmationCount = fields.confirmationCount?.integerValue ? parseInt(fields.confirmationCount.integerValue, 10) : 0;
  const currentEvidenceCount = fields.evidenceCount?.integerValue ? parseInt(fields.evidenceCount.integerValue, 10) : 0;
  const currentFlagCount = fields.flagCount?.integerValue ? parseInt(fields.flagCount.integerValue, 10) : 0;
  const confidenceData = calculateConfidence({
    reportCount: currentReportCount,
    confirmationCount: currentConfirmationCount,
    evidenceCount: currentEvidenceCount,
    flagCount: currentFlagCount
  });
  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/issueClusters/${clusterId}?updateMask.fieldPaths=communityConfidence`;
  const payload = {
    fields: {
      communityConfidence: {
        mapValue: {
          fields: {
            score: { integerValue: confidenceData.score },
            level: { stringValue: confidenceData.level },
            factors: {
              arrayValue: {
                values: confidenceData.factors.map((f) => ({ stringValue: f }))
              }
            }
          }
        }
      }
    }
  };
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const patchResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload)
  });
  if (!patchResponse.ok) {
    console.error("Failed to update confidence:", await patchResponse.text());
    throw new Error("Failed to update confidence on Firestore");
  }
  return confidenceData;
}
__name(updateClusterConfidence, "updateClusterConfidence");

// priority/analyzePriority.js
var AI_ADJUSTMENT_MAX = 10;
var AI_ADJUSTMENT_MIN = -10;
var THRESHOLDS = {
  critical: 75,
  high: 50,
  medium: 30,
  low: 0
};
function getPriorityLevel(score) {
  if (score >= THRESHOLDS.critical) return "Critical";
  if (score >= THRESHOLDS.high) return "High";
  if (score >= THRESHOLDS.medium) return "Medium";
  return "Low";
}
__name(getPriorityLevel, "getPriorityLevel");
async function handleAnalyzePriority(request, env) {
  const body = await request.json();
  const { clusterId, issueData } = body;
  if (!clusterId || !issueData || !issueData.priority?.baseScore) {
    return new Response(JSON.stringify({ error: "Missing clusterId or base priority data" }), { status: 400 });
  }
  const baseScore = issueData.priority.baseScore;
  const factors = issueData.priority.factors || [];
  const prompt = `
    You are an AI Priority Engine for a Civic Issue reporting system.
    Your task is to review the deterministic civic priority and suggest a minor contextual adjustment based on safety, urgency, and public impact.

    Civic Issue Details:
    - Title: ${issueData.title || "Unknown"}
    - Description: ${issueData.description || "Unknown"}
    - Category: ${issueData.category || "Unknown"}
    - AI Severity: ${issueData.aiAnalysis?.severity || "Unknown"}
    - Report Count: ${issueData.reportCount || 1}
    - Community Confidence: ${issueData.communityConfidence?.score || 0}%
    
    Deterministic Base Score: ${baseScore}/100
    Factors:
    ${factors.map((f) => `- ${f}`).join("\n")}

    Provide your recommendation in strict JSON format.
    You MUST NOT invent facts (e.g., do not claim there is a school nearby unless the description/location implies it).
    
    Schema:
    {
      "recommendation": "increase" | "maintain" | "decrease",
      "adjustment": number (between -10 and 10),
      "context": "Concise 1-2 sentence explanation of your reasoning based on public safety/urgency."
    }
  `;
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });
    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    }
    const data = await geminiResponse.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const aiResult = JSON.parse(rawText);
    let clampedAdjustment = Number(aiResult.adjustment) || 0;
    clampedAdjustment = Math.max(AI_ADJUSTMENT_MIN, Math.min(AI_ADJUSTMENT_MAX, clampedAdjustment));
    const finalScore = Math.max(0, Math.min(100, baseScore + clampedAdjustment));
    const level = getPriorityLevel(finalScore);
    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;
    const projectId = env.FIREBASE_PROJECT_ID || "citizenvox-91c1a";
    const collectionName = body.isCluster ? "issueClusters" : "issues";
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${clusterId}?updateMask.fieldPaths=priority.aiAdjustment&updateMask.fieldPaths=priority.finalScore&updateMask.fieldPaths=priority.level&updateMask.fieldPaths=priority.aiContext&updateMask.fieldPaths=priority.updatedAt`;
    const payload = {
      fields: {
        priority: {
          mapValue: {
            fields: {
              baseScore: { integerValue: baseScore },
              // Retain existing base score
              aiAdjustment: { integerValue: clampedAdjustment },
              finalScore: { integerValue: finalScore },
              level: { stringValue: level },
              aiContext: { stringValue: aiResult.context || "No context provided." },
              factors: {
                arrayValue: {
                  values: factors.map((f) => ({ stringValue: f }))
                }
              },
              updatedAt: { timestampValue: (/* @__PURE__ */ new Date()).toISOString() }
            }
          }
        }
      }
    };
    const patchHeaders = { "Content-Type": "application/json" };
    if (token) patchHeaders["Authorization"] = `Bearer ${token}`;
    const patchResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: patchHeaders,
      body: JSON.stringify(payload)
    });
    if (!patchResponse.ok) {
      console.warn("Worker could not save AI Priority. Make sure client updates it. Error:", await patchResponse.text());
      return new Response(JSON.stringify({
        success: true,
        priority: { baseScore, aiAdjustment: clampedAdjustment, finalScore, level, aiContext: aiResult.context, factors }
      }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      success: true,
      priority: { baseScore, aiAdjustment: clampedAdjustment, finalScore, level, aiContext: aiResult.context, factors }
    }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    throw new Error("AI Priority Analysis failed: " + err.message);
  }
}
__name(handleAnalyzePriority, "handleAnalyzePriority");

// index.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var index_default = {
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
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
async function handleRecalculateConfidence(request, env) {
  const body = await request.json();
  const { clusterId } = body;
  if (!clusterId) {
    return new Response(JSON.stringify({ error: "Missing clusterId" }), { status: 400, headers: corsHeaders });
  }
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "") : null;
  try {
    const result = await updateClusterConfidence(env, clusterId, token);
    return new Response(JSON.stringify({ success: true, confidence: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    throw new Error("Confidence recalculation failed: " + err.message);
  }
}
__name(handleRecalculateConfidence, "handleRecalculateConfidence");
async function handleAnalyzeIssue(request, env) {
  const body = await request.json();
  const { issueId, description, category, media, latitude, longitude } = body;
  if (!description && !category) {
    return new Response(JSON.stringify({ error: "Missing description or category" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
  let userPrompt = `User Selected Category: ${category}
Description: ${description}
`;
  const parts = [{ text: systemPrompt }, { text: userPrompt }];
  if (media && media.length > 0) {
    parts.push({ text: `Note: User provided ${media.length} image(s). (Assume visual evidence corroborates the description unless otherwise noted).` });
  }
  const geminiPayload = {
    contents: [{ role: "user", parts }],
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
    confidence: typeof aiResult.confidence === "number" ? aiResult.confidence : 0.5,
    language: aiResult.language || "unknown",
    extractedLocation: aiResult.extractedLocation || null,
    impact: aiResult.impact || "Unknown impact.",
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
    model: "gemini-1.5-flash"
  };
  return new Response(JSON.stringify({ success: true, aiAnalysis: normalizedResult }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleAnalyzeIssue, "handleAnalyzeIssue");
async function handleCheckDuplicates(request, env) {
  const body = await request.json();
  const { newReport, candidates } = body;
  if (!newReport || !candidates || !Array.isArray(candidates)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  if (candidates.length === 0) {
    return new Response(JSON.stringify({ success: true, result: { potentialMatch: false } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
  let userPrompt = `NEW REPORT:
Title: ${newReport.title}
Category: ${newReport.category}
Desc: ${newReport.description}

CANDIDATES:
`;
  candidates.forEach((c, i) => {
    userPrompt += `[Candidate ${i + 1}]
ID: ${c.id}
Title: ${c.title}
Category: ${c.category}
Desc: ${c.description}
Distance: ${c.distanceStr}

`;
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
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleCheckDuplicates, "handleCheckDuplicates");
async function handleAnalyzeIntelligence(request, env) {
  const body = await request.json();
  const { metrics } = body;
  if (!metrics) {
    return new Response(JSON.stringify({ error: "Missing intelligence metrics" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
  let userPrompt = `COMPUTED METRICS:
${JSON.stringify(metrics, null, 2)}`;
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
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleAnalyzeIntelligence, "handleAnalyzeIntelligence");
async function handleCopilot(request, env) {
  const body = await request.json();
  const { question, contextData, role } = body;
  if (!question || !contextData) {
    return new Response(JSON.stringify({ error: "Missing question or contextData" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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
  let userPrompt = `CONTEXT DATA:
${JSON.stringify(contextData, null, 2)}

QUESTION:
${question}`;
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
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleCopilot, "handleCopilot");

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-KTBBE3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-KTBBE3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
