import { useEffect, useReducer, type Dispatch } from 'react'
import { createSession, sessionReducer, type Session, type SessionAction } from '../lib/session'
import { loadBestScores, saveBestScores } from '../lib/storage'

function reducer(session: Session, action: SessionAction): Session {
  return sessionReducer(session, action)
}

export function useGameSession(): [Session, Dispatch<SessionAction>] {
  const [session, dispatch] = useReducer(reducer, undefined, () =>
    createSession({ bests: loadBestScores() })
  )

  useEffect(() => {
    saveBestScores(session.bests)
  }, [session.bests])

  return [session, dispatch]
}
