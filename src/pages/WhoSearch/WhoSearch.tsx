//Placeholder file for WhoSearch
// export const WhoSearch = () => {
//   return (
//     <>
//       <div>Type the common or scientific name of any species on earth.</div>
//       <input type="text" />
//       <button>Search</button>
//     </>
//   )
// }

// Shriya's idea for WhoSearch according to the info in the placeholder
import { useEffect, useState } from 'react'
import { apiClient } from '../../utils'

interface Species {
  taxon_id: number
  scientific_name: string
  common_name: string
  predator_events: number
  prey_events: number
  default_photo?: { square_url: string }
}

export const WhoSearch = () => {
  const [allSpecies, setAllSpecies] = useState<Species[]>([])
  const [searchResults, setSearchResults] = useState<Species[] | null>(null)
  const [isLoadingAll, setIsLoadingAll] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Load full species list on mount
  useEffect(() => {
    let canceled = false

    const fetchAll = async () => {
      setIsLoadingAll(true)
      const accumulated: Species[] = []
      let offset = 0
      const limit = 200

      try {
        while (true) {
          if (canceled) return
          const res = await apiClient.get(`/v1/species?limit=${limit}&offset=${offset}`)
          const results: Species[] = res.data.results || []
          accumulated.push(...results)
          if (results.length < limit) break
          offset += limit
        }
        if (!canceled) setAllSpecies(accumulated)
      } catch {
        if (!canceled) setError('Failed to load species.')
      } finally {
        if (!canceled) setIsLoadingAll(false)
      }
    }

    fetchAll()
    return () => { canceled = true }
  }, [])

  // Search endpoint when user types 2+ characters
  useEffect(() => {
    const term = searchTerm.trim()

    if (term.length < 2) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    let canceled = false
    setIsSearching(true)
    setError(null)

    apiClient
      .get(`/v1/species/search?q=${encodeURIComponent(term)}`)
      .then((res) => {
        if (!canceled) {
          const rawResults = res.data.results || []
         
          // Re-map results to match backend missing metrics against the cached allSpecies array
          const hydratedResults = rawResults.map((searchItem: any) => {
            const matchedSpecies = allSpecies.find(s => s.taxon_id === searchItem.taxon_id)
            return {
              ...searchItem,
              predator_events: matchedSpecies ? matchedSpecies.predator_events : 0,
              prey_events: matchedSpecies ? matchedSpecies.prey_events : 0
            }
          })

          setSearchResults(hydratedResults)
          setIsSearching(false)
        }
      })
      .catch(() => {
        if (!canceled) {
          setError('Failed to search species.')
          setIsSearching(false)
        }
      })

    return () => { canceled = true }
  }, [searchTerm, allSpecies]) // Added allSpecies dependency for accurate hydration lookups

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault()
  }

  // Decide what to display
  const displayList = searchResults !== null ? searchResults : allSpecies
  const isLoading = isLoadingAll || isSearching
  const isSearchMode = searchTerm.trim().length >= 2

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Species Directory</h1>
      <p className="text-sm text-slate-600 mb-4">
        Type the common or scientific name of any species on earth.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search species..."
          className="flex-1 border border-slate-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="px-4 bg-orange-500 text-white font-semibold rounded"
        >
          Search
        </button>
      </form>

      {isLoading && (
        <p className="text-slate-500">
          {isSearchMode ? 'Searching...' : 'Loading species...'}
        </p>
      )}

      {error && (
        <p className="text-red-600">{error}</p>
      )}

      {!isLoading && !error && displayList.length > 0 && (
        <>
          <p className="text-xs text-slate-400 mb-3">
            {isSearchMode
              ? `${displayList.length} result${displayList.length !== 1 ? 's' : ''} for "${searchTerm.trim()}"`
              : `${displayList.length} species total`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayList.map((s) => (
              <div
                key={s.taxon_id}
                className="border border-slate-200 rounded p-3 hover:bg-slate-50 flex gap-3"
              >
                {s.default_photo?.square_url && (
                  <img
                    src={s.default_photo.square_url}
                    alt={s.common_name || s.scientific_name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    {s.common_name || s.scientific_name}
                  </p>
                  <p className="text-xs italic text-slate-500">
                    {s.scientific_name}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Predator events: {s.predator_events ?? 0} | Prey events: {s.prey_events ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isLoading && !error && displayList.length === 0 && isSearchMode && (
        <p className="text-slate-500">No species match your search.</p>
      )}
    </div>
  )
}
