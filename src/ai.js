import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config'

const client = new Anthropic({
    apiKey: process.env.CLAUDE_KEY
});

export async function pingLlm (messages, sysPrompt) {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: sysPrompt,
      messages,
      tools: [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}]
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')

    return { data: text }

  } catch (e) {
    console.error(e)

    return { error: e }
  }
}