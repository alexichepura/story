import { Location } from "history"
import React, { createContext, createElement, FC, useContext } from "react"
import { matchRoutes, Route, RouteMatch, RouteObject, Routes } from "react-router"
import { IStory, TBranchItem } from "story"
import { DbClient } from "./db"

export type TAppStory = IStory<Location>

export type TGetBranch<T = RouteObject> = (routes: T[], pathname: string) => TBranchItem[]
type TDataRoutesProps = {
  routes: TAppRouteConfig[]
  story: TAppStory
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, story }) => {
  return (
    <Routes>
      {routes.map((route) => {
        const key = route.dataKey && story.state.keys[route.dataKey]
        const data = key && story.data[key]
        return (
          <Route
            key={route.dataKey + "!" + key}
            path={route.path}
            caseSensitive={route.caseSensitive}
            element={
              <RouteCtx.Provider
                value={{ data, route: route, abortController: story.state.abortController }}
              >
                {route.element}
              </RouteCtx.Provider>
            }
          />
        )
      })}
    </Routes>
  )
}
type TRouteCtx = { data: any; route: TAppRouteConfig; abortController?: AbortController }
const RouteCtx = React.createContext<TRouteCtx>((null as any) as TRouteCtx)
export const RouteWrapper: FC<{ el: React.ComponentType<any> }> = ({ el }) => {
  const ctx = useContext(RouteCtx)
  return createElement(el, { route: ctx.route, abortController: ctx.abortController, ...ctx.data })
}

export type TAppRouteConfig = RouteObject & {
  children?: TAppRouteConfig[]
  dataKey?: string
  loadData?: TLoadData<any>
}
type TRouteMatch = RouteMatch & { route: TAppRouteConfig }

export const StoryContext = createContext((null as any) as TAppStory)
export function useStory(): TAppStory {
  return useContext(StoryContext)
}

export type TAppBranchItem = TBranchItem & { match: TRouteMatch }

export const getBranch: TGetBranch<TAppRouteConfig> = (routes, pathname) => {
  const matches: TRouteMatch[] = matchRoutes(routes, pathname) || []
  const items = matches.map((m) => {
    const branchItem: TAppBranchItem = {
      url: m.pathname,
      load: m.route.loadData,
      key: m.route.dataKey,
      match: m,
    }
    return branchItem
  })
  return items
}

export const createBranchItemMapper = (story: TAppStory, deps: TDeps) => (
  branchItem: TAppBranchItem,
  abortController: AbortController
): [TLoadDataProps<{}>, TDeps] => {
  return [{ story, abortController, match: branchItem.match }, deps]
}

type TLoadDataProps<M> = {
  story: TAppStory
  match: { params: M }
  abortController: AbortController
}
type TLocationData = Record<string, any>
type TLoadDataResult<D = TLocationData> = D
type TStoryLoadData<D, M, Deps> = (
  options: TLoadDataProps<M>,
  deps: Deps
) => Promise<TLoadDataResult<D>>

export type TDeps = { apiSdk: DbClient }
export type TLoadData<T, M = any> = TStoryLoadData<T, M, TDeps>
export type TRouteComponentProps<D> = {
  route: TAppRouteConfig
  abortController?: AbortController
} & D
