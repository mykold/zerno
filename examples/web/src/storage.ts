const DELETE_KEY = "zerno-web.delete"

// IndexedDB refuses to delete a database while the page holds it open, so the
// deletion is requested here and carried out on the next start-up
export function requestStorageDeletion() {
  localStorage.clear()
  localStorage.setItem(DELETE_KEY, "1")
  location.reload()
}

export async function deletePendingStorage(...databases: string[]) {
  if (!localStorage.getItem(DELETE_KEY)) return
  await Promise.all(
    databases.map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
    )
  )
  localStorage.removeItem(DELETE_KEY)
}
