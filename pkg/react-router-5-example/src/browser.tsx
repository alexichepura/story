import { createBrowserHistory } from "history"
import React from "react"
import { render } from "react-dom"
import { Router } from "react-router"
import { createStory, IStory } from "story"
import { DataRoutes, Preloader } from "story-react-router-5"
import { createBranchItemMapper, getBranch, routes, StoryContext, TAppBranchItem } from "./app"
import { DbClient } from "./db"

const init = async () => {
  const history = createBrowserHistory()
  const deps = { apiSdk: new DbClient() }
  const story: IStory = createStory({
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
