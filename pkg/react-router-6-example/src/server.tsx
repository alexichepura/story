require("dotenv").config()
import { createMemoryHistory, Location } from "history"
import { createServer } from "http"
import React from "react"
import { renderToString } from "react-dom/server"
import { Router } from "react-router"
import { createStory } from "story"
import { routes } from "./app"
import { DbClient } from "./db"
import { env } from "./env"
import {
  createBranchItemMapper,
  DataRoutes,
  getBranch,
  StoryContext,
  TAppBranchItem,
  TAppStory,
} from "./route"

const { DISABLE_SSR, PORT, WDS_PORT } = env

const server = createServer(async (request, response) => {
  try {
    const pathname: string = request.url || ""
    if (DISABLE_SSR === "true") {
      response.statusCode = 200
      response.end(template({ html: "", data: null, statusCode: 200 }))
    } else {
      const deps = { apiSdk: new DbClient() }
      const story: TAppStory = createStory({
        branchItemsMapper: (branchItem, abortController) => {
          return createBranchItemMapper(story, deps)(branchItem as TAppBranchItem, abortController)
        },
        onLoadError: (err) => {
          console.log("onLoadError", err)
        },
      })
      await story.loadData(getBranch(routes, pathname), {
        pathname,
        state: {},
        key: "",
        search: "",
        hash: "",
      })
      const history = createMemoryHistory({ initialEntries: [story.state.location.pathname] })
      const html = renderToString(
        <StoryContext.Provider value={story}>
          <Router navigator={history} location={story.state.location as Location<{}>}>
            <DataRoutes routes={routes} story={story} />
          </Router>
        </StoryContext.Provider>
      )
      const { statusCode } = story.state
      const { data } = story
      response.statusCode = statusCode
      response.end(template({ html, data, statusCode }))
    }
  } catch (e) {
    console.log(e)
    response.end(e)
  }
})

server.listen(PORT, () => {
  console.log("🚀 Server started", "http://localhost:" + PORT)
})

type TTemplateProps = {
  html: string
  data: any
  statusCode: number
}
const template = (props: TTemplateProps) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>App</title>
</head>
<body>
  <div id="app">${props.html}</div>
  <script>window.ssr_data = ${JSON.stringify(props.data)}</script>
  <script>window.ssr_statusCode = ${props.statusCode}</script>
  <script src="${
    WDS_PORT ? `http://localhost:${WDS_PORT}/dist/runtime.js` : "/dist/runtime.js"
  }"></script>
  <script src="${
    WDS_PORT ? `http://localhost:${WDS_PORT}/dist/browser.js` : "/dist/browser.js"
  }"></script>
</body>
</html>
`
