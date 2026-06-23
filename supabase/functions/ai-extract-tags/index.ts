import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AITags {
  skill_required: string[];
  constraints: string[];
  experience_level: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Anthropic Claude API to extract structured tags
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      // Fallback: Simple keyword extraction without AI
      const fallbackTags = extractTagsLocally(text);
      return new Response(
        JSON.stringify(fallbackTags),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Analyze the following job requirements and extract structured information. Return ONLY valid JSON with no additional text.

Requirements: "${text}"

Return JSON in this exact format:
{
  "skill_required": ["skill1", "skill2", ...],
  "constraints": ["constraint1", "constraint2", ...],
  "experience_level": "Junior/Mid-level/Senior"
}

Rules:
- skills_required: list up to 5 specific technical or professional skills mentioned
- constraints: list any limitations like remote, on-site, urgent, part-time, etc.
- experience_level: determine based on seniority keywords (senior, lead, junior, entry-level, etc.) default to "Mid-level"`
          }
        ]
      })
    });

    if (!response.ok) {
      console.error("Anthropic API error:", await response.text());
      const fallbackTags = extractTagsLocally(text);
      return new Response(
        JSON.stringify(fallbackTags),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let tags: AITags;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      tags = extractTagsLocally(text);
    }

    // Validate and sanitize the response
    const sanitizedTags: AITags = {
      skill_required: Array.isArray(tags?.skill_required)
        ? tags.skill_required.filter((s: unknown) => typeof s === "string").slice(0, 5)
        : [],
      constraints: Array.isArray(tags?.constraints)
        ? tags.constraints.filter((c: unknown) => typeof c === "string")
        : [],
      experience_level: typeof tags?.experience_level === "string"
        ? tags.experience_level
        : "Mid-level",
    };

    return new Response(
      JSON.stringify(sanitizedTags),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback local extraction function
function extractTagsLocally(text: string): AITags {
  const skills = [
    "React", "Node.js", "TypeScript", "JavaScript", "Python", "AWS", "Docker",
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "GraphQL", "REST", "API",
    "Figma", "UI Design", "UX Design", "Adobe", "Photoshop", "Illustrator",
    "Content Writing", "SEO", "Social Media", "Marketing", "Copywriting",
    "Video Editing", "Premiere Pro", "After Effects", "DaVinci Resolve",
    "Excel", "Data Entry", "Analysis", "PowerPoint", "Word",
    "App Testing", "QA", "Appium", "Selenium", "Android", "iOS",
    "Full Stack", "Frontend", "Backend", "Mobile", "Web",
  ];

  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();

  skills.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase()) && foundSkills.length < 5) {
      foundSkills.push(skill);
    }
  });

  const constraints: string[] = [];
  if (lowerText.includes("remote")) constraints.push("Remote");
  if (lowerText.includes("on-site") || lowerText.includes("on site")) constraints.push("On-site");
  if (lowerText.includes("urgent") || lowerText.includes("asap")) constraints.push("Urgent");
  if (lowerText.includes("part-time")) constraints.push("Part-time");
  if (lowerText.includes("full-time")) constraints.push("Full-time");
  if (lowerText.includes("contract")) constraints.push("Contract");

  let experienceLevel = "Mid-level";
  if (lowerText.includes("senior") || lowerText.includes("lead") || lowerText.includes("expert")) {
    experienceLevel = "Senior";
  } else if (lowerText.includes("junior") || lowerText.includes("entry") || lowerText.includes("fresher")) {
    experienceLevel = "Junior";
  }

  return {
    skill_required: foundSkills,
    constraints,
    experience_level: experienceLevel,
  };
}
