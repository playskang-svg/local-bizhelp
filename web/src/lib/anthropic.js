// Anthropic Messages call (PindaAI server.js pattern). Throws on HTTP error / timeout; never logs content.
export async function chat(env, { system, messages, tools }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL || 'claude-haiku-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system, messages, tools, // no tool_choice: Claude 5 thinking may reject forced tool use
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const blocks = data.content || [];
  return {
    text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('').trim(),
    toolInput: blocks.find((b) => b.type === 'tool_use' && b.name === 'respond')?.input,
    refusal: data.stop_reason === 'refusal',
  };
}
