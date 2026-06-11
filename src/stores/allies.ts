import { reactive, watch } from 'vue'
import type { StoredAlly } from '../types/aoe4world'

const LS_KEY = 'aoe4scout.allies'

function load(): StoredAlly[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as StoredAlly[]) : []
  } catch {
    return []
  }
}

const allies = reactive<StoredAlly[]>(load())

watch(allies, (v) => localStorage.setItem(LS_KEY, JSON.stringify(v)), { deep: true })

export function useAllies() {
  function isAlly(profileId: number): boolean {
    return allies.some((a) => a.profile_id === profileId)
  }

  function addAlly(ally: StoredAlly) {
    if (!isAlly(ally.profile_id)) allies.push(ally)
  }

  function removeAlly(profileId: number) {
    const i = allies.findIndex((a) => a.profile_id === profileId)
    if (i >= 0) allies.splice(i, 1)
  }

  function toggleAlly(ally: StoredAlly) {
    isAlly(ally.profile_id) ? removeAlly(ally.profile_id) : addAlly(ally)
  }

  return { allies, isAlly, addAlly, removeAlly, toggleAlly }
}
