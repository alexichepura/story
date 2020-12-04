export type TRouteConfig = {
  loadData?: (...args: any) => Promise<any>
  dataKey?: string
  routes?: TRouteConfig[]
}

export type TStatusCode = number
export type TBranchItem = { route: TRouteConfig; matchUrl: string }

type TLocation = any
export type TState = {
  abortController?: AbortController
  location: TLocation
  loading: boolean
  statusCode: TStatusCode
  keys: Record<string, string>
}
export type TStates = TState[]

type TBranchItemsMapper = (branchItem: TBranchItem, abortController: AbortController) => any

type TStoryProps = {
  data?: Record<string, any>
  statusCode?: TStatusCode
  branchItemsMapper: TBranchItemsMapper
  onLoadError?: (err: Error) => void
}

export class Story {
  onLoadError: (err: Error) => void = (err) => {
    throw err
  }
  branchItemsMapper: TBranchItemsMapper
  get loading(): boolean {
    return this.states.some((state) => state.loading)
  }
  maxStates = 2
  states: TStates = []
  private i: number = -1
  data: Record<string, any> = {}
  get state(): TState {
    return this.states[this.i]
  }
  get is404(): boolean {
    return this.state.statusCode === 404
  }

  constructor(props: TStoryProps) {
    this.branchItemsMapper = props.branchItemsMapper
    if (props.onLoadError) {
      this.onLoadError = props.onLoadError
    }
    if (props.data) {
      this.data = props.data
    }
    if (props.statusCode) {
      this.merge(0, { statusCode: props.statusCode })
    }
  }

  private merge(i: number, state: Partial<TState>) {
    this.states[i] = { ...(this.states[i] || {}), ...state }
  }

  loadData = async (
    branch: TBranchItem[],
    location: TLocation,
    push?: boolean
  ): Promise<boolean> => {
    const i = this.i + 1
    const abortController =
      "AbortController" in global
        ? new AbortController()
        : ({ signal: { aborted: false } } as AbortController)

    const keys = branch.reduce<Record<string, string>>((p, c) => {
      if (c.route.dataKey) {
        const key = getKey(c.route.dataKey, c.matchUrl)
        if (key) {
          p[c.route.dataKey] = key
        }
      }
      return p
    }, {})

    if (i === 0) {
      this.merge(0, { location, keys })
    }
    const diffedMatches = branch.filter((branchItem) => {
      const key = getKey(branchItem.route.dataKey, branchItem.matchUrl)
      const data = key ? this.data[key] : null
      return (
        !data ||
        (push &&
          branchItem.route.dataKey &&
          this.state.keys[branchItem.route.dataKey] !== keys[branchItem.route.dataKey])
      )
    })
    this.merge(i, {
      keys,
      location,
      abortController,
      loading: true,
    })

    try {
      const [loadedData] = await Promise.all([
        loadBranchDataObject(diffedMatches, (branchItem) => {
          return this.branchItemsMapper(branchItem, abortController)
        }),
        // loadBranchComponents(branch),
      ])
      Object.entries(loadedData).forEach(([key, matchData]) => {
        this.data[key] = matchData
      })
    } catch (err) {
      if (err.name === "AbortError") {
        // request was aborted, so we don't care about this error
      } else {
        this.onLoadError(err)
      }
      return false
    }

    this.merge(i, {
      loading: false,
      statusCode: this.states[i].statusCode || 200,
    })
    this.i = i
    if (this.states.length > this.maxStates) {
      this.states.splice(0, this.states.length - this.maxStates)
      this.i = this.maxStates - 1
    }
    return true
  }
  abortLoading() {
    this.states.forEach((state) => {
      state.abortController?.abort()
      state.loading = false
    })
  }
  setStatus(statusCode: TStatusCode) {
    this.states[this.i + 1].statusCode = statusCode
  }
  set404 = (): void => {
    this.setStatus(404)
  }
}

type TPromiseConfig = {
  dataKey: string
  promise: Promise<any>
}

type TLoadDataResult = any
export async function loadBranchDataObject(
  branches: TBranchItem[],
  branchItemsMapper: (branchItem: TBranchItem) => any[]
): Promise<TLoadDataResult> {
  const promisesConfig: TPromiseConfig[] = branches
    .map(
      (branchItem: TBranchItem): TPromiseConfig => {
        if (branchItem.route.loadData) {
          const loaderArgs = branchItemsMapper(branchItem)
          return {
            dataKey: getKey(branchItem.route.dataKey, branchItem.matchUrl) || "",
            promise: branchItem.route.loadData(...loaderArgs),
          }
        }
        return Promise.resolve(null) as any
      }
    )
    .filter(Boolean)

  const results = await Promise.all(promisesConfig.map((c) => c.promise))
  const resultsObject = results.reduce((prev, current, index) => {
    prev[promisesConfig[index].dataKey] = current
    return prev
  }, {} as Record<string, TLoadDataResult>)
  return resultsObject
}

const getKey = (k1: string | undefined, k2: string | undefined): string | undefined =>
  k1 && k2 ? k1 + ":" + k2 : undefined
