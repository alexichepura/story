import React, { createContext, FC, useContext } from "react"
import { matchRoutes, Outlet, PartialRouteObject, useRoutes } from "react-router"
import { Link } from "react-router-dom"
import { Story, TBranchItem, TRouteConfig } from "story"
import { DbClient, TArticle } from "./db"

export type TReactRouterRouteConfig = PartialRouteObject & TRouteConfig
export type TGetBranch = (routes: TRouteConfig[], pathname: string) => TBranchItem[]

type TDataRoutesProps = {
  routes: TReactRouterRouteConfig[]
  story: Story
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, story }) => {
  console.log("DataRoutes", routes.length, story.state.location)
  const element = useRoutes(routes)
  return element
  // return (
  //   <Routes>
  //     {routes.map((route, i) => {
  //       const key = route.dataKey && story.state.keys[route.dataKey]
  //       const data = key && story.data[key]
  //       return (
  //         <Route
  //           key={route.key || i}
  //           path={route.path}
  //           render={(_props) => {
  //             const props = {
  //               ..._props,
  //               ...data,
  //               route: route,
  //               abortController: story.state.abortController,
  //             }
  //             return route.render
  //               ? route.render(props)
  //               : route.component && <route.component {...props} />
  //           }}
  //         />
  //       )
  //     })}
  //   </Routes>
  // )
}

type TAppRouteConfig = TRouteConfig & {
  routes?: TAppRouteConfig[]
}
type TRouteComponentProps<D> = {
  route: TReactRouterRouteConfig & TAppRouteConfig
  abortController?: AbortController
} & D
export const StoryContext = createContext((null as any) as Story)
function useStory(): Story {
  return useContext(StoryContext)
}

export type TAppBranchItem = TBranchItem & { match: match }

export const getBranch: TGetBranch = (routes, pathname) =>
  matchRoutes(routes, pathname).map((m) => ({
    route: m.route,
    matchUrl: m.match.url,
    match: m.match,
  }))

export const createBranchItemMapper = (story: Story, deps: TDeps) => (
  branchItem: TAppBranchItem,
  abortController: AbortController
): [TLoadDataProps<{}>, TDeps] => [{ story, abortController, match: branchItem.match }, deps]

type TLoadDataProps<M> = {
  story: Story
  match: match<M>
  abortController: AbortController
}
type TLocationData = Record<string, any>
type TLoadDataResult<D = TLocationData> = D
type TStoryLoadData<D, M, Deps> = (
  options: TLoadDataProps<M>,
  deps: Deps
) => Promise<TLoadDataResult<D>>

export type TDeps = { apiSdk: DbClient }
type TLoadData<T, M = any> = TStoryLoadData<T, M, TDeps>

const link_style: React.CSSProperties = { marginLeft: "1rem" }

// LAYOUT
type TLayoutData = {
  year: number
  articles: TArticle[]
}
type TLayoutProps = TRouteComponentProps<TLayoutData>
export const Layout: FC<TLayoutProps> = ({ year, articles }) => {
  const story = useStory()
  return (
    <div>
      <header>
        <div>
          <Link to="">home</Link>
          {articles.map((a) => (
            <Link key={a.slug} to={"/" + a.slug} style={link_style}>
              {a.title}
            </Link>
          ))}
          {articles.map((a) => (
            <Link key={"sub" + a.slug} to={"/subarticle/" + a.slug} style={link_style}>
              sub: {a.title}
            </Link>
          ))}
          <Link to="/article-404" style={link_style}>
            Article 404
          </Link>
          <Link to="/route/404" style={link_style}>
            Route 404
          </Link>
          <span style={link_style}>{story.loading ? "Loading" : "Loaded"}</span>
        </div>
        <div>
          <Link to="/long-loading">Long Loading (abort controller)</Link>
          {/* {abortController ? (
            <button onClick={() => abortController.abort()}>Abort loading</button>
          ) : null} */}
        </div>
        <div>
          <a href="#hash1">hash1 link</a>
          <br />
          <a href="#hash2">hash2 link</a>
        </div>
      </header>
      <main style={{ marginBottom: "1000px" }}>
        <Outlet />
      </main>
      <div id="hash1" style={{ marginBottom: "1000px" }}>
        hash1
      </div>
      <div id="hash2">hash2</div>
      <footer>&copy; {year}</footer>
    </div>
  )
}
const layoutLoader: TLoadData<TLayoutData> = async ({ abortController }, { apiSdk }) => {
  console.log("layoutLoader")
  const [year, articles] = await Promise.all([
    apiSdk.getYear(abortController.signal),
    apiSdk.getArticles(abortController.signal),
  ])
  return { year, articles }
}

// HOME
type THomeData = {
  articles: TArticle[]
}
type THomeProps = TRouteComponentProps<THomeData>
export const Home: FC<THomeProps> = ({ articles }) => (
  <div>
    <h1>Page Home</h1>
    <div>
      <h2>Articles</h2>
      <div>
        {articles.map((a) => (
          <div key={a.slug}>{a.title}</div>
        ))}
      </div>
    </div>
  </div>
)
const homeLoader: TLoadData<THomeData> = async ({ abortController }, { apiSdk }) => {
  console.log("homeLoader")
  const articles = await apiSdk.getArticles(abortController.signal)
  return { articles }
}

// ARTICLE
type TArticleMatchParams = { slug: string }
type TArticleProps = TRouteComponentProps<TArticleData>
type TArticleData = {
  article: TArticle
}
export const Article: FC<TArticleProps> = (props) => {
  return (
    <div>
      <h1>Page {props.article.title}</h1>
      <article>{props.article.content}</article>
    </div>
  )
}

const articleLoader: TLoadData<TArticleData | null, TArticleMatchParams> = async (
  { abortController, match, story },
  { apiSdk }
) => {
  console.log("articleLoader", match.params.slug)
  const article = await apiSdk.getArticle(match.params.slug, abortController.signal)
  if (!article) {
    story.set404()
    return null
  }
  return { article }
}

// LongLoading
type TLongLoadingProps = TRouteComponentProps<TLongLoadingData>
type TLongLoadingData = {
  longLoadingData: string
}
export const LongLoading: FC<TLongLoadingProps> = ({ longLoadingData }) => (
  <div>
    <h1>Long Loading (abort controller)</h1>
    <article>{longLoadingData}</article>
  </div>
)
const longLoadingLoader: TLoadData<Partial<TLongLoadingData>> = async (
  { abortController },
  { apiSdk }
) => {
  console.log("longLoadingLoader")
  const longLoadingData = await apiSdk.getLongLoading(abortController.signal)
  return { longLoadingData }
}

// NOT FOUND
export const NotFound: FC = () => (
  <div>
    <h1>404 not found</h1>
  </div>
)

export const routes: TReactRouterRouteConfig[] = [
  {
    element: Layout,
    dataKey: "layout",
    loadData: layoutLoader,
    children: [
      {
        path: "/",
        element: Home,
        dataKey: "home",
        loadData: homeLoader,
      },
      {
        path: "/long-loading",
        element: LongLoading,
        dataKey: "longLoading",
        loadData: longLoadingLoader,
      },
      {
        path: "/subarticle/:slug",
        element: Article,
        exact: true,
        dataKey: "subarticle",
        loadData: articleLoader,
      },
      {
        path: "/:slug",
        element: Article,
        exact: true,
        dataKey: "article",
        loadData: articleLoader,
      },
      {
        element: NotFound,
        path: "/*",
        dataKey: "404",
        loadData: async ({ story }) => story.set404(),
      },
    ],
  },
]
