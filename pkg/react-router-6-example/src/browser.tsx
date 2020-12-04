import { BrowserHistory, createBrowserHistory, Location } from "history"
import React, { FC, useEffect, useState } from "react"
import { render } from "react-dom"
import { Router } from "react-router"
import { Story } from "story"
import {
  createBranchItemMapper,
  DataRoutes,
  getBranch,
  routes,
  StoryContext,
  TAppBranchItem,
} from "./app"
import { DbClient } from "./db"

const Browser: FC<{ history: BrowserHistory; story: Story }> = ({ history, story }) => {
  const [, set_render_location] = useState(story.state.location)

  useEffect(() => {
    history.listen(async ({ location, action }) => {
      story.abortLoading()
      const branch = getBranch(routes, location.pathname)
      await story.loadData(branch, location.pathname, action === "PUSH")
      set_render_location(location)
    })
  }, [])

  return (
    <Router navigator={history} location={story.state.location as Location<{}>}>
      <DataRoutes routes={routes} story={story} />
    </Router>
  )
}

const init = async () => {
  const history = createBrowserHistory()
  const deps = { apiSdk: new DbClient() }
  const story: Story = new Story({
    branchItemsMapper: (branchItem, abortController) =>
      createBranchItemMapper(story, deps)(branchItem as TAppBranchItem, abortController),
    data: window.ssr_data,
    statusCode: window.ssr_statusCode,
    onLoadError: (err) => {
      console.log("onLoadError", err)
    },
  })
  const { pathname } = history.location
  await story.loadData(getBranch(routes, pathname), pathname)
  const el = document.getElementById("app")
  render(
    <StoryContext.Provider value={story}>
      <Browser history={history} story={story} />
    </StoryContext.Provider>,
    el
  )
}
init()

declare global {
  interface Window {
    ssr_data: any
    ssr_statusCode: number
  }
}
