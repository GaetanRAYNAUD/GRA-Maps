export function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>Cartes de France</h1>
      <p>Nouvelle version en construction.</p>
      <p>
        Données : <code>{import.meta.env.VITE_DATA_BASE_URL ?? 'non configuré'}</code>
      </p>
    </main>
  )
}
