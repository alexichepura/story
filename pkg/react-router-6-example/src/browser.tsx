import { BrowserHistory, createBrowserHistory, Location } from "history"
import React, { FC, useEffect, useState } from "react"
import { hydrate, render } from "react-dom"
import { Router } from "react-router"
import { createStory } from "story"
import { routes } from "./app"
import { DbClient } from "./db"
import {
  createBranchItemMapper,
  DataRoutes,
  getBranch,
  StoryContext,
  TAppBranchItem,
  TAppStory,
} from "./route"

const Browser: FC<{ history: BrowserHistory; story: TAppStory }> = ({ history, story }) => {
  const [, set_render_location] = useState(story.state.location)
  const [, up] = useState([])

  useEffect(() => {
    history.listen(async ({ location, action }) => {
      story.abortLoading()
      const branch = getBranch(routes, location.pathname)
      up([]) // force rerender on history change
      await story.loadData(branch, location, action === "PUSH")
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
  const story: TAppStory = createStory({
    branchItemsMapper: (branchItem, abortController) =>
      createBranchItemMapper(story, deps)(branchItem as TAppBranchItem, abortController),
    data: window.ssr_data,
    statusCode: window.ssr_statusCode,
    onLoadError: (err) => {
      console.log("onLoadError", err)
    },
  })

  await story.loadData(getBranch(routes, history.location.pathname), history.location)
  const el = document.getElementById("app")
  if (!el) throw new Error("no el")
  const renderer = el.childNodes.length === 0 ? render : hydrate
  renderer(
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
