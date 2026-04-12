export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureAuthenticated } = await import('./lib/terpai')
    await ensureAuthenticated()
  }
}
