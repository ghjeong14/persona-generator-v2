export async function generatePersona(prompt) {
    const res = await fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
  
    if (!res.ok) {
      throw new Error("Failed to fetch persona");
    }
  
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "(No output)";
  }
  
export function buildPersonaPrompt(groups) {
    let prompt = "Given the following axial coding themes, generate one or more user personas:\n\n";
    groups.forEach(group => {
      prompt += `Theme: ${group.label}\nNotes:\n`;
      group.notes.forEach(note => {
        prompt += `- ${note}\n`;
      });
      prompt += `\n`;
    });
    prompt += `Return the personas as descriptions of users with goals, needs, behaviors, and frustrations.`;
    return prompt;
  }

  console.log("Sending prompt to OpenRouter:", prompt);
  console.log("OpenRouter response:", data);