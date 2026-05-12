/**
 * Tiny event bus for imperatively opening the ORCID login modal from
 * anywhere in the app (e.g., useGatedAction).
 */

export interface OpenLoginEvent {
    return_url: string
}

type Listener = (e: OpenLoginEvent) => void
const listeners = new Set<Listener>()

export function openLoginModal(event: OpenLoginEvent): void {
    for (const fn of listeners) fn(event)
}

export function subscribeLoginModal(fn: Listener): () => void {
    listeners.add(fn)
    return () => {
        listeners.delete(fn)
    }
}
