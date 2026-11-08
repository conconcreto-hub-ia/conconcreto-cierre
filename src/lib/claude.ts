// Una sola forma de pedirle algo estructurado a Claude: una herramienta con su esquema.
// Sonnet 5.5 piensa siempre; `effort: low` deja el pensamiento justo para extraer y redactar.

export const MODELO = process.env.MODELO_AGENTE || "claude-sonnet-5-5";

type Herramienta = { name: string; description: string; input_schema: Record<string, unknown> };

export async function pedirEstructurado<T>(args: { sistema: string; usuario: string; herramienta: Herramienta; maxTokens?: number }): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: args.maxTokens ?? 4000,
      output_config: { effort: "low" },
      system: args.sistema,
      tools: [args.herramienta],
      messages: [{ role: "user", content: args.usuario }],
    }),
  });
  if (!res.ok) throw new Error(`Claude respondió ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = (await res.json()) as { content: { type: string; name?: string; input?: unknown }[] };
  const uso = json.content.find((c) => c.type === "tool_use" && c.name === args.herramienta.name);
  if (!uso?.input) throw new Error(`Claude no usó la herramienta ${args.herramienta.name}.`);
  return uso.input as T;
}
