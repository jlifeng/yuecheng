export interface HttpRequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  mockResponse?: T
  mockDelay?: number
}

export const httpRequest = async <T>(url: string, options: HttpRequestOptions<T> = {}): Promise<T> => {
  const delay = Math.max(0, options.mockDelay ?? 80)
  await new Promise((resolve) => setTimeout(resolve, delay))

  if (options.mockResponse !== undefined) {
    return options.mockResponse
  }

  return {} as T
}
