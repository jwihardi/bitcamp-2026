import { chromium } from 'playwright'
import type { Page } from 'playwright'
import type { Locator } from 'playwright'
import path from 'path'
import fs from 'fs'

export type LLMResult =
  | { ok: true; text: string }
  | { ok: false; status: number; body: { error: string } }

export function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('LLM returned malformed JSON.')
  }
  return raw.slice(start, end + 1)
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

type Message = { role: 'user' | 'assistant'; content: string }

const TERPAI_URL = 'https://terpai.umd.edu'
// Captures cookies, localStorage AND sessionStorage — covers all JWT storage strategies
const AUTH_FILE = path.join(process.cwd(), '.terpai-auth.json')

const RESPONSE_TIMEOUT_MS = 120_000
const STABILITY_CHECK_MS = 3_000
const POLL_INTERVAL_MS = 1_500
const CHAT_INPUT_SELECTORS: Array<{ sel: string; timeout: number }> = [
  { sel: '#chat-textarea', timeout: 3000 },
  { sel: 'textarea#prompt-textarea', timeout: 3000 },
  { sel: '[data-testid="chat-input"]', timeout: 2000 },
  { sel: '[data-testid="message-input"]', timeout: 2000 },
  { sel: '[aria-multiline="true"]', timeout: 2000 },
  { sel: '[role="textbox"]:not([aria-readonly="true"])', timeout: 2000 },
  { sel: 'textarea[placeholder]', timeout: 3000 },
  { sel: '[contenteditable="true"][role="textbox"]', timeout: 2000 },
  { sel: '[contenteditable="true"]', timeout: 2000 },
  { sel: 'textarea', timeout: 3000 },
  { sel: 'main input[type="text"]', timeout: 1500 },
  { sel: 'form input[type="text"]', timeout: 1500 },
]

type CapturedStorage = {
  cookies: object[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

// Mutex: one Playwright session at a time
let sessionLock = Promise.resolve()
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = sessionLock.then(fn)
  sessionLock = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function log(event: string, payload?: unknown) {
  if (payload !== undefined) console.info('[terpai]', event, payload)
  else console.info('[terpai]', event)
}

function isAuthUrl(url: string): boolean {
  return url.includes('/auth/') || url.includes('shib.umd.edu') || url.includes('/idp/')
}

/** Capture cookies + localStorage + sessionStorage from the current page. */
async function captureStorage(page: Page): Promise<CapturedStorage> {
  const { cookies } = await page.context().storageState()

  const { ls, ss } = await page.evaluate(() => {
    const ls: Record<string, string> = {}
    const ss: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      ls[k] = localStorage.getItem(k)!
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!
      ss[k] = sessionStorage.getItem(k)!
    }
    return { ls, ss }
  })

  return { cookies, localStorage: ls, sessionStorage: ss }
}

/** Inject all saved storage into a new browser context BEFORE any page loads. */
async function applyStorage(ctx: Awaited<ReturnType<typeof chromium.launch>>['newContext'] extends (...a: never[]) => Promise<infer T> ? T : never, auth: CapturedStorage) {
  await ctx.addInitScript(
    ({ ls, ss }: { ls: Record<string, string>; ss: Record<string, string> }) => {
      for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v)
      for (const [k, v] of Object.entries(ss)) sessionStorage.setItem(k, v)
    },
    { ls: auth.localStorage, ss: auth.sessionStorage },
  )
}

/** Load saved auth from disk and return it, or null if none. */
function loadAuth(): CapturedStorage | null {
  if (!fs.existsSync(AUTH_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as CapturedStorage
  } catch {
    return null
  }
}

function saveAuth(auth: CapturedStorage) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth))
  log('auth_saved', { keys: { ls: Object.keys(auth.localStorage), ss: Object.keys(auth.sessionStorage) } })
}

function deleteAuthFile() {
  if (!fs.existsSync(AUTH_FILE)) return
  fs.unlinkSync(AUTH_FILE)
}

/**
 * Open a visible browser, let the user log in, capture all storage, save to disk.
 */
async function performLogin(): Promise<boolean> {
  console.log('\n[terpai] ============================================')
  console.log('[terpai] Log in to TerpAI in the browser that opens.')
  console.log('[terpai] After login loads the main page, wait 5 seconds.')
  console.log('[terpai] The window will close automatically.')
  console.log('[terpai] ============================================\n')

  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  try {
    await page.goto(TERPAI_URL)

    // Wait for auth page to appear (SPA may need a moment to redirect)
    try {
      await page.waitForURL((url) => isAuthUrl(url.href), { timeout: 12_000 })
    } catch {
      // No auth redirect — might already be logged in
    }

    if (!isAuthUrl(page.url())) {
      log('already_logged_in')
    } else {
      log('waiting_for_login')
      await page.waitForURL(
        (url) => !isAuthUrl(url.href) && url.href.startsWith(TERPAI_URL),
        { timeout: 300_000 },
      )
      log('login_detected')
    }

    // Let the SPA fully initialize and write its tokens (localStorage / sessionStorage)
    await page.waitForTimeout(4000)

    const auth = await captureStorage(page)
    log('captured', {
      cookies: auth.cookies.length,
      lsKeys: Object.keys(auth.localStorage),
      ssKeys: Object.keys(auth.sessionStorage),
    })
    saveAuth(auth)
    return true
  } catch {
    log('login_timeout')
    return false
  } finally {
    await browser.close()
  }
}

async function hasUsableAuth(): Promise<boolean> {
  const auth = loadAuth()
  if (!auth) return false

  const browser = await chromium.launch({ headless: true })
  try {
    const ctx = await browser.newContext({
      storageState: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cookies: auth.cookies as any,
        origins: [],
      },
    })

    await applyStorage(ctx, auth)
    const page = await ctx.newPage()
    await page.goto(TERPAI_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForTimeout(4000)

    const currentUrl = page.url()
    const valid = !isAuthUrl(currentUrl) && currentUrl.startsWith(TERPAI_URL)
    log('auth_validation', { valid, url: currentUrl, title: await page.title() })
    return valid
  } catch (error) {
    log('auth_validation_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  } finally {
    await browser.close()
  }
}

async function doCallTerpAI(messages: Message[], retried = false): Promise<LLMResult> {
  const prompt = messages
    .map((m) => (m.role === 'user' ? m.content : `Assistant: ${m.content}`))
    .join('\n\n')
    .trim()

  const debug = process.env.DEBUG_TERPAI === 'true'

  // ── Ensure we have saved auth ────────────────────────────────────────────
  if (!loadAuth()) {
    const ok = await performLogin()
    if (!ok) {
      return { ok: false, status: 503, body: { error: 'TerpAI: login timed out.' } }
    }
  }

  const auth = loadAuth()!

  // ── Open headless browser with all auth injected ─────────────────────────
  const browser = await chromium.launch({ headless: !debug })
  try {
    const ctx = await browser.newContext({
      // Inject cookies via storageState shape
      storageState: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cookies: auth.cookies as any,
        origins: [],
      },
    })

    // Inject localStorage + sessionStorage before any page loads
    await applyStorage(ctx, auth)

    const page = await ctx.newPage()

    log('navigate')
    await page.goto(TERPAI_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 })

    // Give SPA time to read storage and perform auth check
    await page.waitForTimeout(5000)

    const currentUrl = page.url()
    log('page', { url: currentUrl, title: await page.title() })

    if (isAuthUrl(currentUrl)) {
      await browser.close()
      log('session_expired')
      fs.unlinkSync(AUTH_FILE)

      if (retried) {
        return {
          ok: false,
          status: 503,
          body: { error: 'TerpAI: still on login page after re-auth. Check debug output.' },
        }
      }

      const ok = await performLogin()
      if (!ok) return { ok: false, status: 503, body: { error: 'TerpAI: re-login failed.' } }
      return doCallTerpAI(messages, true)
    }

    // ── Send prompt ──────────────────────────────────────────────────────────
    await startNewChat(page)
    await acceptGuidelinesIfPresent(page)

    const input = await findInput(page)
    if (!input) {
      return {
        ok: false,
        status: 502,
        body: { error: 'TerpAI: chat input not found. Set DEBUG_TERPAI=true to inspect.' },
      }
    }

    const baselineConversation = await extractConversationText(page)

    await input.click()
    await input.fill(prompt)
    await input.evaluate((el: HTMLElement) => {
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const sent = await submitPrompt(page, input)
    if (!sent) {
      await saveDebugScreenshot(page)
      return {
        ok: false,
        status: 502,
        body: { error: 'TerpAI: prompt submit did not trigger.' },
      }
    }
    log('sent', { chars: prompt.length })

    const responseText = await waitForResponse(page, baselineConversation)
    if (!responseText) {
      return { ok: false, status: 502, body: { error: 'TerpAI: response timed out or was empty.' } }
    }

    log('raw_response', { preview: responseText.slice(0, 200) })
    return { ok: true, text: responseText }
  } finally {
    await browser.close()
  }
}

async function startNewChat(page: Page) {
  await acceptGuidelinesIfPresent(page)
  if (await findInput(page, false)) {
    log('chat_ready_existing_page', { url: page.url() })
    return
  }

  // Prefer the visible "New Chat" control first. Deep-linking to /chat/new
  // can reopen an unavailable prior thread on Nebula/TerpAI.
  const clickTargets = [
    page.getByRole('link', { name: /new chat/i }),
    page.getByRole('button', { name: /new chat/i }),
    page.locator('text=/^New Chat$/i'),
    page.locator('text=/^New chat$/i'),
    page.locator('a:has-text("New Chat")'),
    page.locator('button:has-text("New Chat")'),
    page.locator('a:has-text("New chat")'),
    page.locator('button:has-text("New chat")'),
    page.locator('[aria-label="New chat"]'),
    page.locator('[aria-label="New Chat"]'),
    page.locator('button[title="New chat"]'),
    page.locator('button[title="New Chat"]'),
    page.locator('[data-testid="new-chat-button"]'),
    page.locator('#new-chat-button'),
  ]

  for (const target of clickTargets) {
    try {
      const el = target.first()
      if (!(await el.isVisible({ timeout: 1000 }))) continue
      await el.click()
      await page.waitForTimeout(2500)
      await acceptGuidelinesIfPresent(page)
      if (await findInput(page, false)) {
        log('new_chat_clicked', { url: page.url() })
        return
      }
      log('new_chat_click_no_input', { url: page.url() })
    } catch {
      // try next
    }
  }

  // TerpAI lands on /chat/agents (dashboard). Try known chat URL patterns next.
  const chatUrls = [
    `${TERPAI_URL}/chat/new`,
    `${TERPAI_URL}/c/new`,
    `${TERPAI_URL}/new`,
  ]

  for (const url of chatUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8_000 })
      await page.waitForTimeout(4000) // React SPA needs time to hydrate
      await acceptGuidelinesIfPresent(page)
      if (await findInput(page, false)) {
        log('new_chat_url', { url: page.url(), attemptedUrl: url })
        return
      }
    } catch {
      // try next URL
    }
  }

  // Navigate back to root first since chat URL attempts may have failed
  if (page.url().includes('/new') || page.url().includes('/c/')) {
    await page.goto(TERPAI_URL, { waitUntil: 'domcontentloaded', timeout: 10_000 })
    await page.waitForTimeout(1500)
  }

  // Final fallback: click first agent card on /chat/agents dashboard
  log('trying_agent_card_click')
  try {
    await page.goto(`${TERPAI_URL}/chat/agents`, { waitUntil: 'domcontentloaded', timeout: 10_000 })
    await page.waitForTimeout(2000)
    const agentCardSelectors = [
      'a[href*="/chat/"]:not([href="/chat/agents"])',
      'button[data-agent]',
      '[data-testid="agent-card"] button',
      'article a',
      'article button',
      'li a[href*="/chat"]',
    ]
    for (const sel of agentCardSelectors) {
      try {
        const el = page.locator(sel).first()
        if (await el.isVisible({ timeout: 800 })) {
          await el.click()
          await page.waitForTimeout(3000)
          await acceptGuidelinesIfPresent(page)
          if (await findInput(page, false)) {
            log('agent_card_clicked', { selector: sel, url: page.url() })
            return
          }
        }
      } catch { /* try next */ }
    }
  } catch { /* best-effort */ }

  log('new_chat_no_button', { url: page.url() })
}

async function acceptGuidelinesIfPresent(page: Page) {
  const viewGuidelinesTargets = [
    page.getByRole('button', { name: /view guidelines/i }),
    page.locator('button:has-text("View Guidelines")'),
    page.locator('text=/Please read and accept the Guidelines to start chatting\\./i'),
  ]

  let gateFound = false
  for (const target of viewGuidelinesTargets) {
    try {
      const el = target.first()
      if (!(await el.isVisible({ timeout: 500 }))) continue
      gateFound = true
      if ((await el.evaluate((node) => node.tagName.toLowerCase()).catch(() => '')) === 'button') {
        await el.click()
      } else {
        const button = page.getByRole('button', { name: /view guidelines/i }).first()
        if (await button.isVisible({ timeout: 1000 })) await button.click()
      }
      log('guidelines_gate_opened', { url: page.url() })
      break
    } catch {
      // try next
    }
  }

  if (!gateFound) return

  await page.waitForTimeout(1000)

  const checkboxTargets = [
    page.locator('[role="dialog"] input[type="checkbox"]'),
    page.locator('[role="dialog"] [role="checkbox"]'),
    page.locator('input[type="checkbox"]'),
    page.locator('[role="checkbox"]'),
  ]

  for (const target of checkboxTargets) {
    try {
      const el = target.first()
      if (!(await el.isVisible({ timeout: 500 }))) continue
      await el.click()
      log('guidelines_checkbox_clicked')
      break
    } catch {
      // continue
    }
  }

  const agreeTargets = [
    page.getByRole('button', { name: /^i agree$/i }),
    page.getByRole('button', { name: /agree/i }),
    page.getByRole('button', { name: /accept/i }),
    page.locator('button:has-text("I Agree")'),
    page.locator('button:has-text("I agree")'),
    page.locator('button:has-text("Accept")'),
  ]

  for (const target of agreeTargets) {
    try {
      const el = target.first()
      if (!(await el.isVisible({ timeout: 1000 }))) continue
      await el.click()
      await page.waitForTimeout(1500)
      log('guidelines_accepted', { url: page.url() })
      return
    } catch {
      // try next
    }
  }

  log('guidelines_accept_not_found', { url: page.url() })
}

async function findInput(page: Page, shouldSaveDebugScreenshot = true) {
  for (const { sel, timeout } of CHAT_INPUT_SELECTORS) {
    try {
      const el = page.locator(sel).first()
      if (await el.isVisible({ timeout })) {
        // Skip inputs that look like search bars
        const ariaLabel = await el.getAttribute('aria-label').catch(() => '')
        const placeholder = await el.getAttribute('placeholder').catch(() => '')
        const tag = await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => '')
        const combined = `${ariaLabel ?? ''} ${placeholder ?? ''}`.toLowerCase()
        if (tag === 'input' && (combined.includes('search') || combined.includes('find'))) {
          log('input_skipped_search', { selector: sel, ariaLabel, placeholder })
          continue
        }
        log('input_found', { selector: sel, tag })
        return el
      }
    } catch {
      // try next
    }
  }

  // Save a screenshot so we can see what the browser is actually showing
  if (shouldSaveDebugScreenshot) {
    await saveDebugScreenshot(page)
  }

  log('input_not_found', { url: page.url() })
  return null
}

async function submitPrompt(page: Page, input: Locator) {
  const sendButtonSelectors = [
    'button[aria-label*="send" i]',
    'button[title*="send" i]',
    '[data-testid*="send" i]',
    'button:has-text("Send")',
    'form button[type="submit"]',
    'main button[type="submit"]',
  ]

  const hasSubmitted = async () => {
    try {
      return await page.evaluate(() => {
        const stopButton = document.querySelector(
          '[aria-label*="stop" i], [title*="stop generating" i], [data-testid*="stop" i]',
        )
        if (stopButton) return true

        const textbox = document.querySelector(
          '#chat-textarea, textarea#prompt-textarea, textarea[placeholder], [contenteditable="true"], [role="textbox"]',
        ) as HTMLTextAreaElement | HTMLInputElement | HTMLElement | null
        if (!textbox) return false

        if (textbox instanceof HTMLTextAreaElement || textbox instanceof HTMLInputElement) {
          return textbox.value.trim().length === 0
        }

        return (textbox.textContent ?? '').trim().length === 0
      })
    } catch {
      return false
    }
  }

  try {
    await input.press('Enter')
    await page.waitForTimeout(1200)
    if (await hasSubmitted()) {
      log('prompt_submitted', { method: 'enter' })
      return true
    }
  } catch {
    // fall through to button click
  }

  for (const sel of sendButtonSelectors) {
    try {
      const button = page.locator(sel).first()
      if (!(await button.isVisible({ timeout: 700 }))) continue
      const disabled = await button.isDisabled().catch(() => false)
      if (disabled) continue
      await button.click()
      await page.waitForTimeout(1200)
      if (await hasSubmitted()) {
        log('prompt_submitted', { method: 'button', selector: sel })
        return true
      }
    } catch {
      // try next
    }
  }

  log('prompt_submit_failed', { url: page.url() })
  return false
}

async function saveDebugScreenshot(page: Page) {
  try {
    const screenshotPath = path.join(process.cwd(), '.terpai-debug.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })
    log('debug_screenshot_saved', { path: screenshotPath })
  } catch {
    // best-effort
  }
}

async function waitForResponse(page: Page, baselineConversation: string): Promise<string | null> {
  const deadline = Date.now() + RESPONSE_TIMEOUT_MS
  await page.waitForTimeout(2000)

  let usedStopButton = false
  try {
    await page.waitForSelector(
      '[aria-label*="stop" i], [title*="stop generating" i], [data-testid*="stop" i], button:has-text("Stop")',
      { state: 'visible', timeout: 5000 },
    )
    usedStopButton = true
    log('streaming_started')
    await page.waitForSelector(
      '[aria-label*="stop" i], [title*="stop generating" i], [data-testid*="stop" i], button:has-text("Stop")',
      { state: 'hidden', timeout: RESPONSE_TIMEOUT_MS },
    )
    log('streaming_done')
    await page.waitForTimeout(400)
  } catch {
    // Fall back to stability polling
  }

  const text = await extractAssistantMessage(page, baselineConversation)
  if (usedStopButton && text) return text

  log('stability_polling')
  let lastText = text
  let stableStart = lastText ? Date.now() : 0

  while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_INTERVAL_MS)
    const current = await extractAssistantMessage(page, baselineConversation)
    if (current && current !== lastText) {
      lastText = current
      stableStart = Date.now()
    } else if (current && stableStart > 0 && Date.now() - stableStart >= STABILITY_CHECK_MS) {
      log('stable')
      return current
    }
  }

  await saveDebugScreenshot(page)
  return lastText || null
}

async function extractAssistantMessage(page: Page, baselineConversation = ''): Promise<string> {
  return page.evaluate(() => {
    const byRole = Array.from(
      document.querySelectorAll('[data-role="assistant"], [data-message-role="assistant"]'),
    )
    if (byRole.length > 0) return byRole[byRole.length - 1].textContent?.trim() ?? ''

    const byClass = Array.from(
      document.querySelectorAll('.message-assistant, .assistant-message, .bot-message'),
    )
    if (byClass.length > 0) return byClass[byClass.length - 1].textContent?.trim() ?? ''

    const allMsgs = Array.from(document.querySelectorAll('.message, .chat-message'))
    const nonUser = allMsgs.filter((el) => {
      const cls = (el as HTMLElement).className ?? ''
      const role = el.getAttribute('data-role') ?? ''
      return !cls.includes('user') && !cls.includes('human') && !role.includes('user')
    })
    if (nonUser.length > 0) return nonUser[nonUser.length - 1].textContent?.trim() ?? ''

    return ''
  }).then(async (structuredText) => {
    if (structuredText.trim()) return structuredText.trim()

    const conversationText = await extractConversationText(page)
    if (!conversationText.trim()) return ''
    if (!baselineConversation.trim()) return conversationText

    if (conversationText === baselineConversation) return ''
    if (conversationText.startsWith(baselineConversation)) {
      return conversationText.slice(baselineConversation.length).trim()
    }

    return conversationText
  })
}

async function extractConversationText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const normalize = (value: string) =>
      value
        .replace(/\u00a0/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    const shouldIgnore = (text: string) => {
      const lower = text.toLowerCase()
      return (
        !lower ||
        lower.includes('please read and accept the guidelines to start chatting') ||
        lower === 'view guidelines' ||
        lower.includes('search for an agent') ||
        lower.includes('can make mistakes') ||
        lower.includes('learn more here')
      )
    }

    const root =
      document.querySelector('main') ??
      document.querySelector('[role="main"]') ??
      document.body

    const candidates = Array.from(
      root.querySelectorAll('article, section, [data-message-id], [data-testid*="message"], main > div, div'),
    )

    const texts = candidates
      .map((el) => normalize((el as HTMLElement).innerText || el.textContent || ''))
      .filter((text) => text.length >= 40 && !shouldIgnore(text))

    if (texts.length > 0) {
      const unique = texts.filter((text, index) => texts.indexOf(text) === index)
      return unique[unique.length - 1]
    }

    return normalize((root as HTMLElement).innerText || root.textContent || '')
  })
}

/** Call before game loads to ensure auth is ready. */
export async function ensureAuthenticated(): Promise<void> {
  await withLock(async () => {
    const auth = loadAuth()
    if (!auth) {
      log('auth_missing_startup_login')
      await performLogin()
      return
    }

    const valid = await hasUsableAuth()
    if (valid) {
      log('auth_already_present')
      return
    }

    log('auth_invalid_startup_relogin')
    deleteAuthFile()
    await performLogin()
  })
}

export async function callTerpAI(
  messages: Message[],
  _maxTokens?: number,
  _config?: object,
): Promise<LLMResult> {
  return withLock(() => doCallTerpAI(messages))
}
