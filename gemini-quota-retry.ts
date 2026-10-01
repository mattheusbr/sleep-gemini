const MAX_TOTAL_ATTEMPTS = 3
const EXTRA_DELAY_MIN_MS = 1_000
const EXTRA_DELAY_MAX_MS = 10_000

type RetryEvent = {
  attempt: number
  error: {
    message: string
    status?: number
  }
  model: {
    providerID: string
    id: string
  }
  decision: {
    retry: boolean
    delay?: number
  }
}

export function parseGeminiRetryDelayMs(message: string): number | undefined {
  const match = message.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/i)
  if (!match) return undefined

  const seconds = Number(match[1])
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined

  return Math.ceil(seconds * 1_000)
}

function isGeminiModel(event: RetryEvent): boolean {
  return event.model.providerID.toLowerCase() === "google"
    && event.model.id.toLowerCase().includes("gemini")
}

function randomExtraDelayMs(): number {
  return EXTRA_DELAY_MIN_MS
    + Math.floor(Math.random() * (EXTRA_DELAY_MAX_MS - EXTRA_DELAY_MIN_MS + 1))
}

const GeminiQuotaRetryPlugin = {
  id: "gemini-quota-retry",

  async setup(ctx: any) {
    await ctx.session.hook("retry", (event: RetryEvent) => {
      if (event.error.status !== 429 || !isGeminiModel(event)) return

      if (event.attempt >= MAX_TOTAL_ATTEMPTS) {
        event.decision = { retry: false }
        console.warn(
          `[gemini-quota-retry] stopping after ${MAX_TOTAL_ATTEMPTS} total attempts for ${event.model.id}`,
        )
        return
      }

      const providerDelayMs = parseGeminiRetryDelayMs(event.error.message)
      if (providerDelayMs === undefined) {
        // Preserve OpenCode's own decision when Gemini did not provide a parseable wait time.
        return
      }

      const extraDelayMs = randomExtraDelayMs()
      const delay = providerDelayMs + extraDelayMs
      event.decision = { retry: true, delay }
      console.warn(
        `[gemini-quota-retry] retry ${event.attempt + 1}/${MAX_TOTAL_ATTEMPTS} for ${event.model.id} in ${(delay / 1_000).toFixed(1)}s (Gemini ${providerDelayMs}ms + jitter ${extraDelayMs}ms)`,
      )
    })
  },
}

export default GeminiQuotaRetryPlugin
