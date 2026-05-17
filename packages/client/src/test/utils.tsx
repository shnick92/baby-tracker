import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** Render inside QueryClientProvider + MemoryRouter (no route params). */
export function renderWithProviders(ui: ReactElement) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Render inside QueryClientProvider + MemoryRouter + Routes for components that use useParams. */
export function renderWithRoute(ui: ReactElement, { route, path }: { route: string; path: string }) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
