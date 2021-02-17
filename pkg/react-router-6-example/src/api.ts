export type TArticle = {
  slug: string
  title: string
  content: string
}

const content1 = `Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. `

const content2 = `Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?
Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur,
vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?`

const articles: TArticle[] = [
  { slug: "article1", title: "Article 1", content: content1 },
  { slug: "article2", title: "Article 2", content: content2 },
]

type TOptionalAbortSignal = AbortSignal | null | undefined
export type TApi = {
  getYear: (signal?: TOptionalAbortSignal) => Promise<number>
  getArticle: (signal: TOptionalAbortSignal, vars: { slug: string }) => Promise<TArticle | null>
  getArticles: (signal?: TOptionalAbortSignal) => Promise<TArticle[]>
  getLongLoading: (signal?: TOptionalAbortSignal) => Promise<string>
}

export const serverApiClient: TApi = {
  getYear: async (signal) => {
    await delayWithSignal(200, signal)
    return 2020
  },
  getArticle: async (signal, vars) => {
    await delayWithSignal(1000, signal)
    return articles.find((article) => article.slug === vars.slug) || null
  },
  getArticles: async (signal?: TOptionalAbortSignal) => {
    await delayWithSignal(400, signal)
    return articles
  },
  getLongLoading: async (signal?: TOptionalAbortSignal) => {
    await delayWithSignal(5000, signal)
    return "long loading data"
  },
}

export const delay = (ms: number = 10): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve()
    }, ms)
  )

function delayWithSignal(ms: number = 10, signal?: AbortSignal | null) {
  if (signal && signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"))
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms, "Promise Resolved")
    if (!("AbortSignal" in global)) return

    const once = () => {
      console.log(`signal got "abort" event`, signal)
      clearTimeout(timeout)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal && signal.addEventListener("abort", once, { once: true })
  })
}
