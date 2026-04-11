'use client'

import { useState } from 'react'
import type { AgentIcon, AgentRole } from '../lib/types'
import { useGame } from '../context/GameContext'
import { AGENT_ICONS } from '../lib/constants'

export function EmptySlot() {
  const { dispatch } = useGame()
  const [hiring, setHiring] = useState(false)
  const [role, setRole] = useState<AgentRole>('sales')
  const [icon, setIcon] = useState<AgentIcon>('robot')
  const [name, setName] = useState('')

  const ROLES: AgentRole[] = ['sales', 'marketing', 'engineering', 'finance']

  function handleHire(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    dispatch({
      type: 'HIRE_AGENT',
      agent: {
        id: crypto.randomUUID(),
        name: name.trim(),
        icon,
        role,
        prompt: '',
        tokenCount: 0,
        qualityScore: 0,
        qualityCached: false,
        cachedPromptText: '',
        driftRisk: true,
        isOffTask: false,
      },
    })

    // Reset form
    setHiring(false)
    setRole('sales')
    setIcon('robot')
    setName('')
  }

  return (
    <article>
      {!hiring ? (
        <button type="button" onClick={() => setHiring(true)}>Hire agent</button>
      ) : (
        <form onSubmit={handleHire}>
          <fieldset>
            <legend>Role</legend>
            {ROLES.map(r => (
              <label key={r}>
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                {r}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Icon</legend>
            {(Object.entries(AGENT_ICONS) as [AgentIcon, string][]).map(([key, emoji]) => (
              <label key={key}>
                <input
                  type="radio"
                  name="icon"
                  value={key}
                  checked={icon === key}
                  onChange={() => setIcon(key)}
                />
                {emoji}
              </label>
            ))}
          </fieldset>

          <input
            type="text"
            placeholder="Name your agent"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <button type="submit">Hire</button>
          <button type="button" onClick={() => setHiring(false)}>Cancel</button>
        </form>
      )}
    </article>
  )
}
