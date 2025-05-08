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
  