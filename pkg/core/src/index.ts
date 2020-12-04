export type TLoadData = (...args: any | undefined) => Promise<any>
export type TDataKey = string

export type TStatusCode = number
export type TBranchItem = { dataKey?: TDataKey; loadData?: TLoadData; matchUrl: string }

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
type TData = Record<string, any>
type TStoryProps = {
  data?: TData
  statusCode?: TStatusCode
  branchItemsMapper: TBranchItemsMapper
  onLoadError: (err: Error) => void
}
export interface IStory<L = TLocation> {
  abortLoading: () => void
  setStatus: (statusCode: TStatusCode) => void
  loadData: (branch: TBranchItem[], location: L, push?: boolean) => Promise<boolean>
  loading: boolean
  state: TState
  data: TData
}

export function createStory<L = TLocation>(props: TStoryProps): IStory<L> {
  let I: number = -1
  const maxStates = 2
  const states: TStates = []
  const data: TData = {}

  function merge(i: number, state: Partial<TState>) {
    states[i] = { ...(states[i] || {}), ...state }
  }
  if (props.statusCode) {
    merge(0, { statusCode: props.statusCode })
  }

  return {
    loadData: async (branch, location, push) => {
      const i = I + 1
      const abortController =
        "AbortController" in global
          ? new AbortController()
          : ({ signal: { aborted: false } } as AbortController)

      const keys = branch.reduce<Record<string, string>>((p, c) => {
        if (c.dataKey) {
          const key = getKey(c.dataKey, c.matchUrl)
          if (key) {
            p[c.dataKey] = key
          }
        }
        return p
      }, {})

      if (i === 0) {
        merge(0, { location, keys })
      }
      const diffedMatches = branch.filter((branchItem) => {
        const key = getKey(branchItem.dataKey, branchItem.matchUrl)
        const _data = key ? data[key] : null
        return (
          !_data ||
          (push &&
            branchItem.dataKey &&
            states[I].keys[branchItem.dataKey] !== keys[branchItem.dataKey])
        )
      })

      merge(i, {
        keys,
        location,
        abortController,
        loading: true,
      })

      try {
        const [loadedData] = await Promise.all([
          loadBranchDataObject(diffedMatches, (branchItem) => {
            return props.branchItemsMapper(branchItem, abortController)
          }),
          // loadBranchComponents(branch),
        ])
        Object.entries(loadedData).forEach(([key, matchData]) => {
          data[key] = matchData
        })
      } catch (err) {
        if (err.name === "AbortError") {
          // request was aborted, so we don't care about this error
        } else {
          props.onLoadError(err)
        }
        return false
      }

      merge(i, {
        loading: false,
        statusCode: states[i].statusCode || 200,
      })
      I = i
      if (states.length > maxStates) {
        states.splice(0, states.length - maxStates)
        I = maxStates - 1
      }
      return true
    },
    abortLoading: () => {
      states.forEach((state) => {
        state.abortController?.abort()
        state.loading = false
      })
    },
    setStatus: (statusCode) => {
      states[I + 1].statusCode = statusCode
    },
    get loading() {
      return states.some((state) => state.loading)
    },
    get state() {
      return states[I]
    },
    get data() {
      return data
    },
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
        if (branchItem.loadData) {
          const loaderArgs = branchItemsMapper(branchItem)
          return {
            dataKey: getKey(branchItem.dataKey, branchItem.matchUrl) || "",
            promise: branchItem.loadData(...loaderArgs),
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
