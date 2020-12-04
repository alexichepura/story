import React, { FC, useEffect, useState } from "react"
import { Route, Switch, useHistory } from "react-router"
import { RouteConfig } from "react-router-config"
import { IStory, TBranchItem } from "story"

export type TGetBranch<T = RouteConfig> = (routes: T[], pathname: string) => TBranchItem[]

type TDataRoutesProps = {
  routes: RouteConfig[]
  story: IStory
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, story }) => {
  console.log("DataRoutes", routes.length, story.state.location)
  return (
    <Switch>
      {routes.map((route, i) => {
        const key = route.dataKey && story.state.keys[route.dataKey]
        const data = key && story.data[key]
        return (
          <Route
            key={route.key || i}
            path={route.path}
            exact={route.exact}
            strict={route.strict}
            render={(_props) => {
              const props = {
                ..._props,
                ...data,
                route: route,
                abortController: story.state.abortController,
              }
              return route.render
                ? route.render(props)
                : route.component && <route.component {...props} />
            }}
          />
        )
      })}
    </Switch>
  )
}

const usePreloader = (story: IStory, routes: RouteConfig[], getBranch: TGetBranch) => {
  const history = useHistory()
  const [, set_render_location] = useState(story.state.location)

  useEffect(() => {
    history.listen(async (new_location, action) => {
      story.abortLoading()
      const branch = getBranch(routes, new_location.pathname)
      await story.loadData(branch, new_location.pathname, action === "PUSH")
      set_render_location(new_location)
    })
  }, [])

  return story.state.location
}

export const Preloader: FC<{
  story: IStory
  routes: RouteConfig[]
  getBranch: TGetBranch
}> = ({ children, story, routes, getBranch }) => {
  const render_location = usePreloader(story, routes, getBranch)
  return <Route location={render_location} render={() => children} />
}
