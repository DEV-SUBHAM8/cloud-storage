import { createContext, useCallback, useContext, useState } from 'react'

const Ctx = createContext(() => {})

export function ToastProvider({ children }) {
  const [list, setList] = useState([])

  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random()
    setList((l) => [...l, { id, msg, kind }])
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg shadow text-sm text-white ${
              t.kind === 'err' ? 'bg-red-600' : 'bg-slate-800'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
