/**
 * Tiny event bus for imperatively opening the ORCID sign-in modal from
 * anywhere in the app — e.g., a "Sign in" link in the nav, or the
 * /account/* pages when reached anonymously.
 *
 * UIET-P1: sign-in is purely opt-in for attribution + self-service.
 * No public surface requires it.
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
