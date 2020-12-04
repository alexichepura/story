import { createBrowserHistory } from "history"
import React from "react"
import { render } from "react-dom"
import { Router } from "react-router"
import { createStory } from "story"
import { DataRoutes, Preloader } from "story-react-router-5"
import {
  createBranchItemMapper,
  getBranch,
  routes,
  StoryContext,
  TAppBranchItem,
  TAppStory,
} from "./app"
import { DbClient } from "./db"

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
  render(
    <StoryContext.Provider value={story}>
      <Router history={history}>
        <Preloader routes={routes} getBranch={getBranch} story={story}>
          <DataRoutes routes={routes} story={story} />
        </Preloader>
      </Router>
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
